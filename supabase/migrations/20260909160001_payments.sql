-- Les 2 Palmiers — paiements simulés & remboursements (Phase 6)
-- Réf. docs/MODELE-DONNEES.md §5, docs/FONCTIONNALITES.md §J
-- provider = 'sim' : les transitions sont déclenchées par l'écran de simulation
-- (Edge Function payments-sim). Machine à états identique à un vrai agrégateur.

create sequence public.payment_ref_seq;

create table public.payments (
  id               uuid primary key default gen_random_uuid(),
  internal_ref     text unique not null,
  provider         text not null default 'sim' check (provider in ('sim','fedapay','kkiapay')),
  provider_ref     text,
  sim_outcome      text check (sim_outcome in ('success','failure','pending')),
  purpose          text not null check (purpose in ('reservation','service_order','balance')),
  reservation_id   uuid references public.reservations(id) on delete set null,
  service_order_id uuid references public.service_orders(id) on delete set null,
  payer_id         uuid not null references public.profiles(id) on delete restrict,
  method           text not null check (method in ('mtn','moov','celtis','card')),
  amount           numeric(12,0) not null check (amount > 0),
  currency         text not null default 'XOF',
  status           text not null default 'pending'
                     check (status in ('pending','paid','failed','refunded','partially_refunded')),
  raw_webhook      jsonb,                                   -- non exposé au staff
  created_at       timestamptz not null default now(),
  paid_at          timestamptz,
  updated_at       timestamptz not null default now()
);
create index payments_payer_idx  on public.payments(payer_id);
create index payments_status_idx on public.payments(status);

create table public.refunds (
  id           uuid primary key default gen_random_uuid(),
  payment_id   uuid not null references public.payments(id) on delete cascade,
  amount       numeric(12,0) not null check (amount > 0),
  reason       text,
  status       text not null default 'done' check (status in ('pending','done','failed')),
  requested_by uuid references public.profiles(id),
  provider_ref text,
  created_at   timestamptz not null default now()
);

create trigger trg_payments_updated_at
  before update on public.payments
  for each row execute function public.set_updated_at();

-- =====================================================================
--  RPC : init du paiement (calcule le montant dû)
-- =====================================================================

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
    if v_res.status <> 'pending_payment' then raise exception 'reservation_not_payable'; end if;
    v_amount := coalesce(nullif(v_res.deposit_amount, 0), v_res.total_amount) - v_res.amount_paid;

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

-- =====================================================================
--  RPC : résolution du paiement (= "webhook" du simulateur), idempotent
-- =====================================================================

create or replace function public.payment_resolve(p_payment uuid, p_outcome text)
returns public.payments
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_pay public.payments;
begin
  select * into v_pay from public.payments where id = p_payment for update;
  if not found then raise exception 'payment_not_found'; end if;

  if v_pay.payer_id <> v_uid and not public.has_permission(v_uid,'payments.view') then
    raise exception 'forbidden';
  end if;

  if v_pay.status <> 'pending' then
    return v_pay;                              -- idempotent
  end if;
  if p_outcome not in ('success','failure','pending') then raise exception 'bad_outcome'; end if;
  if p_outcome = 'pending' then return v_pay; end if;

  update public.payments set
    status      = case when p_outcome = 'success' then 'paid' else 'failed' end,
    sim_outcome = p_outcome,
    paid_at     = case when p_outcome = 'success' then now() end,
    raw_webhook = jsonb_build_object('sim', true, 'outcome', p_outcome, 'at', now()),
    updated_at  = now()
  where id = p_payment
  returning * into v_pay;

  if p_outcome = 'success' then
    if v_pay.purpose = 'reservation' then
      update public.reservations set
        amount_paid = amount_paid + v_pay.amount,
        status = case when status = 'pending_payment' then 'confirmed' else status end
      where id = v_pay.reservation_id;
      insert into public.reservation_events (reservation_id, type, payload, actor_id)
      values (v_pay.reservation_id, 'paid',
              jsonb_build_object('amount', v_pay.amount, 'payment', v_pay.id), v_uid);

    elsif v_pay.purpose = 'service_order' then
      update public.service_orders set amount_paid = amount_paid + v_pay.amount
      where id = v_pay.service_order_id;
      insert into public.service_order_events (service_order_id, type, payload, actor_id)
      values (v_pay.service_order_id, 'paid',
              jsonb_build_object('amount', v_pay.amount, 'payment', v_pay.id), v_uid);
    end if;
  end if;

  return v_pay;
end;
$$;

-- =====================================================================
--  RPC : remboursement (staff/admin avec payments.refund)
-- =====================================================================

create or replace function public.payment_refund(
  p_payment uuid, p_amount numeric, p_reason text default null
) returns public.refunds
language plpgsql security definer set search_path = public as $$
declare
  v_uid      uuid := auth.uid();
  v_pay      public.payments;
  v_refunded numeric;
  v_refund   public.refunds;
begin
  if not public.has_permission(v_uid,'payments.refund') then raise exception 'forbidden'; end if;

  select * into v_pay from public.payments where id = p_payment for update;
  if not found then raise exception 'payment_not_found'; end if;
  if v_pay.status not in ('paid','partially_refunded') then raise exception 'not_refundable'; end if;

  select coalesce(sum(amount), 0) into v_refunded
  from public.refunds where payment_id = p_payment and status = 'done';

  if p_amount <= 0 or v_refunded + p_amount > v_pay.amount then raise exception 'amount_exceeds'; end if;

  insert into public.refunds (payment_id, amount, reason, status, requested_by, provider_ref)
  values (p_payment, p_amount, p_reason, 'done', v_uid, 'sim-' || gen_random_uuid())
  returning * into v_refund;

  update public.payments set
    status = case when v_refunded + p_amount >= v_pay.amount then 'refunded' else 'partially_refunded' end,
    updated_at = now()
  where id = p_payment;

  return v_refund;
end;
$$;

-- =====================================================================
--  RLS
-- =====================================================================

alter table public.payments enable row level security;
alter table public.refunds  enable row level security;

-- le payeur voit ses paiements (sans raw_webhook via une vue plus tard) ;
-- le staff payments.view voit tout. Écriture uniquement via les RPC.
create policy payments_select on public.payments for select to authenticated
  using (payer_id = auth.uid() or public.has_permission(auth.uid(),'payments.view'));

create policy refunds_select on public.refunds for select to authenticated
  using (
    public.has_permission(auth.uid(),'payments.view')
    or exists (select 1 from public.payments p where p.id = payment_id and p.payer_id = auth.uid())
  );

-- =====================================================================
--  GRANTS
-- =====================================================================

grant select on public.payments, public.refunds to authenticated;

grant execute on function public.payment_init(text, uuid, text)          to authenticated;
grant execute on function public.payment_resolve(uuid, text)             to authenticated;
grant execute on function public.payment_refund(uuid, numeric, text)     to authenticated;
