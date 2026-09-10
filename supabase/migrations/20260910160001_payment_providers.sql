-- =====================================================================
--  Prestataires de paiement (PSP) — architecture prête, simulateur par défaut
--  Adaptateurs : sim (démo) · fedapay · kkiapay · stripe
--  Les clés PUBLIQUES vivent ici ; les clés SECRÈTES restent dans les
--  secrets Supabase (lues par les Edge Functions payment-checkout / webhook).
-- =====================================================================

alter table public.payments drop constraint if exists payments_provider_check;
alter table public.payments add constraint payments_provider_check
  check (provider = any (array['sim', 'fedapay', 'kkiapay', 'stripe']));

create table if not exists public.payment_settings (
  id                 int primary key default 1 check (id = 1),
  active_provider    text not null default 'sim'
                       check (active_provider in ('sim', 'fedapay', 'kkiapay', 'stripe')),
  mode               text not null default 'test' check (mode in ('test', 'live')),
  fedapay_public_key text,
  kkiapay_public_key text,
  stripe_public_key  text,
  currency           text not null default 'XOF',
  updated_at         timestamptz not null default now(),
  updated_by         uuid references public.profiles(id) on delete set null
);
insert into public.payment_settings (id) values (1) on conflict (id) do nothing;

alter table public.payment_settings enable row level security;

-- lecture : tout utilisateur connecté (le tunnel a besoin de la clé publique)
drop policy if exists payment_settings_read on public.payment_settings;
create policy payment_settings_read on public.payment_settings
  for select to authenticated using (true);

drop policy if exists payment_settings_write on public.payment_settings;
create policy payment_settings_write on public.payment_settings
  for update to authenticated
  using (public.auth_has_permission('settings.edit'))
  with check (public.auth_has_permission('settings.edit'));

-- config publique (aussi pour anon : page de réservation)
create or replace function public.payment_settings_public()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'provider', active_provider,
    'mode', mode,
    'public_key', case active_provider
                    when 'fedapay' then fedapay_public_key
                    when 'kkiapay' then kkiapay_public_key
                    when 'stripe'  then stripe_public_key
                    else null end,
    'currency', currency
  )
  from public.payment_settings where id = 1;
$$;
grant execute on function public.payment_settings_public() to anon, authenticated;

-- =====================================================================
--  Confirmation d'un paiement par un webhook PSP (service_role uniquement)
--  Réutilise exactement la logique de règlement de payment_resolve.
-- =====================================================================
create or replace function public.payment_mark_paid_external(
  p_internal_ref text,
  p_provider text,
  p_provider_ref text,
  p_raw jsonb default '{}'::jsonb
)
returns public.payments
language plpgsql security definer set search_path = public as $$
declare
  v_pay public.payments;
begin
  select * into v_pay from public.payments where internal_ref = p_internal_ref for update;
  if not found then raise exception 'payment_not_found'; end if;
  if v_pay.status = 'paid' then return v_pay; end if;   -- idempotent

  update public.payments set
    status       = 'paid',
    provider     = p_provider,
    provider_ref = p_provider_ref,
    paid_at      = now(),
    raw_webhook  = p_raw,
    updated_at   = now()
  where id = v_pay.id
  returning * into v_pay;

  if v_pay.purpose in ('reservation', 'balance') then
    update public.reservations set
      amount_paid = amount_paid + v_pay.amount,
      status = case when status = 'pending_payment' then 'confirmed' else status end
    where id = v_pay.reservation_id;
    insert into public.reservation_events (reservation_id, type, payload)
    values (v_pay.reservation_id, 'paid',
            jsonb_build_object('amount', v_pay.amount, 'payment', v_pay.id, 'provider', p_provider));

  elsif v_pay.purpose = 'service_order' then
    update public.service_orders set amount_paid = amount_paid + v_pay.amount
    where id = v_pay.service_order_id;
    insert into public.service_order_events (service_order_id, type, payload)
    values (v_pay.service_order_id, 'paid',
            jsonb_build_object('amount', v_pay.amount, 'payment', v_pay.id, 'provider', p_provider));
  end if;

  return v_pay;
end $$;

grant execute on function public.payment_mark_paid_external(text, text, text, jsonb) to service_role;

-- garde-fou : marquer un paiement échoué (webhook)
create or replace function public.payment_mark_failed_external(p_internal_ref text, p_raw jsonb default '{}'::jsonb)
returns void language sql security definer set search_path = public as $$
  update public.payments
    set status = 'failed', raw_webhook = p_raw, updated_at = now()
    where internal_ref = p_internal_ref and status = 'pending';
$$;
grant execute on function public.payment_mark_failed_external(text, jsonb) to service_role;
