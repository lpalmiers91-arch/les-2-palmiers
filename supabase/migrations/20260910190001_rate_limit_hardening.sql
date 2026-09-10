-- =====================================================================
--  Durcissement : limitation de débit sur les points d'entrée publics
-- =====================================================================

-- 1. track_event : plafonné par session (≤ 240 évènements/heure/session)
create or replace function public.track_event(
  p_session text, p_event text, p_path text default null, p_referrer text default null,
  p_utm jsonb default '{}'::jsonb, p_meta jsonb default '{}'::jsonb, p_ua text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(trim(p_session), '') = '' or coalesce(trim(p_event), '') = '' then return; end if;
  if not public.rl_hit('evt:' || left(p_session, 64), 240, interval '1 hour') then
    return;  -- silencieux : on ne casse pas la page pour un dépassement d'analytics
  end if;

  insert into public.analytics_events
    (session_id, user_id, event, path, referrer, utm_source, utm_medium, utm_campaign, meta, ua)
  values (
    left(p_session, 64), auth.uid(), left(p_event, 40),
    left(p_path, 300), left(p_referrer, 300),
    left(p_utm->>'source', 80), left(p_utm->>'medium', 80), left(p_utm->>'campaign', 120),
    coalesce(p_meta, '{}'::jsonb), left(p_ua, 300)
  );
end $$;
grant execute on function public.track_event(text, text, text, text, jsonb, jsonb, text) to anon, authenticated;

-- 2. create_booking : ≤ 8 réservations créées / heure / utilisateur
create or replace function public.create_booking(
  p_apartment uuid,
  p_range daterange,
  p_guests int default 2,
  p_deposit_percent int default 50,
  p_services uuid[] default '{}'
) returns public.reservations
language plpgsql security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_quote  jsonb;
  v_stay   numeric;
  v_svc    public.services;
  v_svc_id uuid;
  v_svc_total numeric := 0;
  v_ref    text;
  v_res    public.reservations;
  v_dep    numeric;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not public.rl_hit('book:' || v_uid::text, 8, interval '1 hour') then
    raise exception 'rate_limited';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_apartment::text));
  v_quote := public.quote_stay(p_apartment, p_range, p_guests);
  if not (v_quote->>'available')::boolean then raise exception 'dates_unavailable'; end if;
  if (v_quote->>'over_capacity')::boolean then raise exception 'over_capacity'; end if;
  if not (v_quote->>'meets_min_nights')::boolean then raise exception 'below_min_nights'; end if;

  v_stay := (v_quote->>'total')::numeric;

  foreach v_svc_id in array coalesce(p_services, '{}')
  loop
    select * into v_svc from public.services where id = v_svc_id and active;
    if found and v_svc.pricing_mode = 'fixed' and v_svc.base_price is not null then
      v_svc_total := v_svc_total + v_svc.base_price;
    end if;
  end loop;

  v_dep := round(v_stay * greatest(least(p_deposit_percent, 100), 1) / 100.0) + v_svc_total;

  v_ref := 'L2P-' || to_char(now(),'YYYY') || '-' ||
           lpad(nextval('public.reservation_ref_seq')::text, 5, '0');

  insert into public.reservations (
    reference, apartment_id, guest_id, date_range, guests_count,
    nightly_price, fees, discount_amount, total_amount, deposit_amount, currency, status, source
  ) values (
    v_ref, p_apartment, v_uid, p_range, p_guests,
    round((v_quote->>'lodging_subtotal')::numeric / nullif((v_quote->>'nights')::numeric, 0)),
    jsonb_build_object(
      'cleaning_fee', (v_quote->>'cleaning_fee')::numeric,
      'services_prepaid', v_svc_total
    ),
    (v_quote->>'discount_amount')::numeric,
    v_stay + v_svc_total,
    v_dep,
    'XOF', 'pending_payment', 'web'
  ) returning * into v_res;

  insert into public.reservation_events (reservation_id, type, payload, actor_id)
  values (v_res.id, 'created', jsonb_build_object('quote', v_quote, 'services', p_services), v_uid);

  foreach v_svc_id in array coalesce(p_services, '{}')
  loop
    select * into v_svc from public.services where id = v_svc_id and active;
    if found and v_svc.pricing_mode = 'fixed' and v_svc.base_price is not null then
      insert into public.service_orders (
        reference, service_id, customer_id, reservation_id,
        status, price, payment_timing, note
      ) values (
        'L2P-S-' || to_char(now(),'YYYY') || '-' ||
          lpad(nextval('public.service_order_ref_seq')::text, 5, '0'),
        v_svc_id, v_uid, v_res.id,
        'accepted', v_svc.base_price, 'prepaid',
        'Ajouté à la réservation ' || v_ref
      );
    end if;
  end loop;

  return v_res;
end $$;
grant execute on function public.create_booking(uuid, daterange, int, int, uuid[]) to authenticated;
