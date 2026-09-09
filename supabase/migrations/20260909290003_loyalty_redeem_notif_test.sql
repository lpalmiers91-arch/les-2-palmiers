-- =====================================================================
--  Fidélité : échange de points contre un crédit (XOF) appliqué au
--  paiement, + notification de test pour la page de préférences.
-- =====================================================================

alter table public.loyalty_settings
  add column if not exists redeem_per_point int not null default 100;   -- XOF de crédit par point échangé
alter table public.loyalty_settings
  add column if not exists min_redeem int not null default 100;         -- palier minimum d'échange

alter table public.loyalty_accounts
  add column if not exists credit_xof numeric(12,0) not null default 0 check (credit_xof >= 0);

-- Échanger des points -> crédit
create or replace function public.redeem_loyalty(p_points int)
returns public.loyalty_accounts
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_s   public.loyalty_settings;
  v_acc public.loyalty_accounts;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_s from public.loyalty_settings where id = 1;
  if not v_s.enabled then raise exception 'loyalty_disabled'; end if;
  if p_points is null or p_points < v_s.min_redeem then raise exception 'below_min_redeem'; end if;

  select * into v_acc from public.loyalty_accounts where client_id = v_uid for update;
  if not found or v_acc.points < p_points then raise exception 'not_enough_points'; end if;

  update public.loyalty_accounts set
    points = points - p_points,
    credit_xof = credit_xof + (p_points::numeric * v_s.redeem_per_point),
    tier = public.loyalty_tier_for(points - p_points),
    updated_at = now()
  where client_id = v_uid
  returning * into v_acc;

  insert into public.loyalty_ledger (client_id, delta, reason, note)
  values (v_uid, -p_points, 'redeem',
          (p_points * v_s.redeem_per_point) || ' XOF de crédit');

  return v_acc;
end $$;

grant execute on function public.redeem_loyalty(int) to authenticated;

-- Consommer du crédit fidélité (interne, appelé par payment_init)
create or replace function public.loyalty_take_credit(p_client uuid, p_max numeric)
returns numeric language plpgsql security definer set search_path = public as $$
declare v_take numeric;
begin
  select least(credit_xof, greatest(p_max, 0)) into v_take
  from public.loyalty_accounts where client_id = p_client for update;
  if coalesce(v_take, 0) <= 0 then return 0; end if;
  update public.loyalty_accounts set credit_xof = credit_xof - v_take, updated_at = now()
  where client_id = p_client;
  insert into public.loyalty_ledger (client_id, delta, reason, note)
  values (p_client, 0, 'credit_used', v_take || ' XOF appliqués à un paiement');
  return v_take;
end $$;

-- payment_init : applique le crédit fidélité disponible avant de créer le paiement
create or replace function public.payment_init(
  p_purpose text, p_target uuid, p_method text
) returns public.payments
language plpgsql security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_amount numeric;
  v_credit numeric := 0;
  v_res    public.reservations;
  v_ord    public.service_orders;
  v_pay    public.payments;
  v_ref    text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_method not in ('mtn','moov','celtis','card') then raise exception 'bad_method'; end if;

  if p_purpose in ('reservation', 'balance') then
    select * into v_res from public.reservations where id = p_target;
    if not found then raise exception 'target_not_found'; end if;
    if v_res.guest_id <> v_uid then raise exception 'not_your_reservation'; end if;
    v_amount := v_res.total_amount - v_res.amount_paid;
    if p_purpose = 'reservation' and v_res.status = 'pending_payment' then
      v_amount := coalesce(nullif(v_res.deposit_amount, 0), v_res.total_amount) - v_res.amount_paid;
    end if;
    -- crédit fidélité
    v_credit := public.loyalty_take_credit(v_uid, v_amount);
    v_amount := v_amount - v_credit;

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
    v_ref, 'sim',
    case when p_purpose = 'balance' then 'balance' else p_purpose end,
    case when p_purpose in ('reservation','balance') then p_target end,
    case when p_purpose = 'service_order' then p_target end,
    v_uid, p_method, v_amount, 'pending'
  ) returning * into v_pay;

  return v_pay;
end;
$$;

grant execute on function public.payment_init(text, uuid, text) to authenticated;

-- Notification de test (page préférences de notification)
create or replace function public.send_test_notification()
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, type, title, body, data)
  values (auth.uid(), 'test', 'Notification de test',
          'Si vous voyez ceci sur votre écran, tout fonctionne.',
          jsonb_build_object('test', true));
end $$;

grant execute on function public.send_test_notification() to authenticated;
