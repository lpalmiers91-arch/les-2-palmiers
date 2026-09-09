-- =====================================================================
--  Panier : réserver un séjour + des services en un seul récapitulatif
--  et un seul paiement (l'acompte couvre le séjour + les services prépayés).
-- =====================================================================

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

  perform pg_advisory_xact_lock(hashtext(p_apartment::text));
  v_quote := public.quote_stay(p_apartment, p_range, p_guests);
  if not (v_quote->>'available')::boolean then raise exception 'dates_unavailable'; end if;
  if (v_quote->>'over_capacity')::boolean then raise exception 'over_capacity'; end if;
  if not (v_quote->>'meets_min_nights')::boolean then raise exception 'below_min_nights'; end if;

  v_stay := (v_quote->>'total')::numeric;

  -- somme des services à prix fixe demandés
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

  -- crée les commandes de service liées (prépayées, couvertes par l'acompte)
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
end;
$$;

grant execute on function public.create_booking(uuid, daterange, int, int, uuid[]) to authenticated;

-- Quand l'acompte est atteint, les services prépayés liés sont marqués réglés.
create or replace function public.on_reservation_paid_settle_services()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.amount_paid >= new.deposit_amount and old.amount_paid < old.deposit_amount then
    update public.service_orders
      set amount_paid = price, updated_at = now()
      where reservation_id = new.id
        and payment_timing = 'prepaid'
        and price is not null
        and amount_paid < price;
  end if;
  return new;
end $$;

drop trigger if exists trg_reservation_settle_services on public.reservations;
create trigger trg_reservation_settle_services
  after update of amount_paid on public.reservations
  for each row execute function public.on_reservation_paid_settle_services();
