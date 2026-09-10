-- =====================================================================
--  1. Autorise une demande de changement de DATES pendant le séjour
--     (extension / départ anticipé). L'annulation reste réservée aux
--     réservations à venir.
--  2. Ajoute au compte de démonstration une réservation « confirmée » à
--     venir : rend visibles, côté client, l'annulation et le changement
--     de dates (le seul séjour existant est en cours).
-- =====================================================================

create or replace function public.request_reservation_change(
  p_reservation uuid,
  p_kind text,
  p_reason text default null,
  p_new_range daterange default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_res public.reservations;
  v_id  uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_kind not in ('cancel', 'dates') then raise exception 'bad_kind'; end if;

  select * into v_res from public.reservations where id = p_reservation;
  if not found then raise exception 'reservation_not_found'; end if;
  if v_res.guest_id <> v_uid then raise exception 'forbidden'; end if;

  if p_kind = 'cancel' and v_res.status not in ('pending_payment', 'confirmed') then
    raise exception 'not_changeable';
  end if;
  if p_kind = 'dates' and v_res.status not in ('pending_payment', 'confirmed', 'in_stay') then
    raise exception 'not_changeable';
  end if;

  if p_kind = 'dates' then
    if p_new_range is null or (upper(p_new_range) - lower(p_new_range)) < 1 then
      raise exception 'bad_range';
    end if;
    if lower(p_new_range) < current_date then raise exception 'range_in_past'; end if;
  end if;

  update public.reservation_change_requests
    set status = 'withdrawn'
    where reservation_id = p_reservation and status = 'pending';

  insert into public.reservation_change_requests (reservation_id, requested_by, kind, reason, new_range)
  values (p_reservation, v_uid, p_kind, nullif(btrim(p_reason), ''), p_new_range)
  returning id into v_id;

  insert into public.notifications (user_id, type, title, body, data, channels)
  select distinct ur.user_id, 'reservation',
         case when p_kind = 'cancel' then 'Demande d''annulation' else 'Demande de changement de dates' end,
         'Réservation ' || v_res.reference,
         jsonb_build_object('reservation_id', v_res.id, 'change_request_id', v_id),
         '{in_app,email,push}'::text[]
  from public.user_roles ur
  join public.role_permissions rp on rp.role_id = ur.role_id
  where rp.permission_key in ('reservations.update', 'messages.handle');

  return v_id;
end $$;

grant execute on function public.request_reservation_change(uuid, text, text, daterange) to authenticated;

-- ---------------------------------------------------------------------
-- Réservation confirmée à venir pour le compte de démonstration.
-- ---------------------------------------------------------------------
do $$
declare
  v_client  uuid;
  v_apt     uuid;
  v_range   daterange;
  v_quote   jsonb;
  v_total   numeric;
  v_deposit numeric;
  v_res     public.reservations;
begin
  select id into v_client from auth.users where email = 'client@les2palmiers.site';
  select id into v_apt from public.apartments where name ilike 'Les 2 Palmiers%' order by created_at limit 1;
  if v_client is null or v_apt is null then return; end if;

  -- déjà une réservation confirmée/à venir ? on ne double pas.
  if exists (
    select 1 from public.reservations
    where guest_id = v_client and status in ('pending_payment', 'confirmed')
  ) then
    return;
  end if;

  v_range := daterange((current_date + 24), (current_date + 29));
  v_quote := public.quote_stay(v_apt, v_range, 2);
  if not coalesce((v_quote->>'available')::boolean, false) then
    v_range := daterange((current_date + 60), (current_date + 65));
    v_quote := public.quote_stay(v_apt, v_range, 2);
  end if;
  if not coalesce((v_quote->>'available')::boolean, false) then return; end if;

  v_total   := (v_quote->>'total')::numeric;
  v_deposit := round(v_total * 0.30);

  insert into public.reservations (
    reference, apartment_id, guest_id, date_range, guests_count,
    nightly_price, fees, discount_amount, total_amount, deposit_amount,
    amount_paid, currency, status, source
  ) values (
    'L2P-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.reservation_ref_seq')::text, 5, '0'),
    v_apt, v_client, v_range, 2,
    round((v_quote->>'lodging_subtotal')::numeric / nullif((v_quote->>'nights')::numeric, 0)),
    jsonb_build_object('cleaning_fee', (v_quote->>'cleaning_fee')::numeric),
    (v_quote->>'discount_amount')::numeric,
    v_total, v_deposit, v_deposit, 'XOF', 'confirmed', 'web'
  ) returning * into v_res;

  insert into public.reservation_events (reservation_id, type, payload) values
    (v_res.id, 'created',        jsonb_build_object('quote', v_quote)),
    (v_res.id, 'deposit_paid',   jsonb_build_object('amount', v_deposit, 'method', 'mtn')),
    (v_res.id, 'status_changed', jsonb_build_object('from', 'pending_payment', 'to', 'confirmed'));

  insert into public.payments (
    internal_ref, provider, sim_outcome, purpose, reservation_id, payer_id,
    method, amount, currency, status, paid_at
  ) values (
    'PMT-' || to_char(now(),'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 6),
    'sim', 'success', 'reservation', v_res.id, v_client,
    'mtn', v_deposit, 'XOF', 'paid', now()
  );
end $$;
