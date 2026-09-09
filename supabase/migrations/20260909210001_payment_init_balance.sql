-- Les 2 Palmiers — payment_init : autoriser le règlement du solde après l'acompte.
-- Réf. docs/FONCTIONNALITES.md §J

create or replace function public.payment_init(
  p_purpose text, p_target uuid, p_method text
) returns public.payments
language plpgsql security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_amount numeric;
  v_res    public.reservations;
  v_ord    public.service_orders;
  v_pay    public.payments;
  v_ref    text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_method not in ('mtn','moov','celtis','card') then raise exception 'bad_method'; end if;

  if p_purpose = 'reservation' then
    select * into v_res from public.reservations where id = p_target;
    if not found then raise exception 'target_not_found'; end if;
    if v_res.guest_id <> v_uid then raise exception 'not_your_reservation'; end if;
    if v_res.status not in ('pending_payment','confirmed','in_stay') then
      raise exception 'reservation_not_payable';
    end if;
    -- pending_payment : on demande l'acompte (ou le total si pas d'acompte)
    -- confirmed / in_stay : on règle le solde
    if v_res.status = 'pending_payment' then
      v_amount := coalesce(nullif(v_res.deposit_amount, 0), v_res.total_amount) - v_res.amount_paid;
    else
      v_amount := v_res.total_amount - v_res.amount_paid;
    end if;

  elsif p_purpose = 'service_order' then
    select * into v_ord from public.service_orders where id = p_target;
    if not found then raise exception 'target_not_found'; end if;
    if v_ord.customer_id <> v_uid then raise exception 'not_your_order'; end if;
    if v_ord.price is null then raise exception 'price_not_set'; end if;
    v_amount := v_ord.price - v_ord.amount_paid;

  else
    raise exception 'unsupported_purpose';
  end if;

  if v_amount <= 0 then raise exception 'nothing_to_pay'; end if;

  v_ref := 'PAY-' || to_char(now(),'YYYYMMDD') || '-' ||
           lpad(nextval('public.payment_ref_seq')::text, 6, '0');

  insert into public.payments (
    internal_ref, provider, purpose, reservation_id, service_order_id, payer_id, method, amount, status
  ) values (
    v_ref, 'sim', p_purpose,
    case when p_purpose = 'reservation'   then p_target end,
    case when p_purpose = 'service_order' then p_target end,
    v_uid, p_method, v_amount, 'pending'
  ) returning * into v_pay;

  return v_pay;
end;
$$;
