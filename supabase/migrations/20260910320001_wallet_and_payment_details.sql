-- =====================================================================
--  Compte client (portefeuille) + envoi des coordonnées de paiement
--
--  1. Portefeuille : le client recharge son compte (simulateur ou preuve
--     de paiement). Le solde sert ensuite à régler un frais de séjour ou
--     le solde d'une réservation, sans ressaisir de moyen de paiement.
--  2. Coordonnées de paiement : l'équipe envoie en un clic les
--     instructions de paiement (Mobile Money / virement) au client dans
--     la messagerie ; le client règle puis joint sa capture.
-- =====================================================================

-- ---- élargissement des contraintes paiements -----------------------
alter table public.payments drop constraint if exists payments_purpose_check;
alter table public.payments add constraint payments_purpose_check
  check (purpose = any (array['reservation','service_order','balance','gift_card','charge','wallet']));

alter table public.payments drop constraint if exists payments_channel_check;
alter table public.payments add constraint payments_channel_check
  check (channel = any (array['online','proof','offline','wallet']));

-- ---- instructions de paiement manuelles (éditables en admin) -------
alter table public.payment_settings
  add column if not exists manual_instructions text;

update public.payment_settings
   set manual_instructions = coalesce(manual_instructions,
'Mobile Money (MTN / Moov) : +229 01 52 00 00 00 — bénéficiaire « Les 2 Palmiers ».
Virement bancaire : IBAN BJ66 0000 1234 5678 9012 3456 78 — Ecobank Bénin.
Merci d''indiquer votre nom et la référence du séjour, puis de joindre la capture du paiement.')
 where id = 1;

-- =====================================================================
--  Portefeuille
-- =====================================================================
create table if not exists public.wallet_accounts (
  user_id    uuid primary key references public.profiles(id) on delete cascade,
  balance    numeric(12,0) not null default 0 check (balance >= 0),
  updated_at timestamptz not null default now()
);

create table if not exists public.wallet_ledger (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  kind          text not null check (kind in ('topup','spend','refund','adjust')),
  amount        numeric(12,0) not null check (amount > 0),
  balance_after numeric(12,0) not null,
  payment_id    uuid references public.payments(id) on delete set null,
  note          text,
  created_at    timestamptz not null default now()
);
create index if not exists wallet_ledger_user_idx on public.wallet_ledger(user_id, created_at desc);

alter table public.wallet_accounts enable row level security;
alter table public.wallet_ledger  enable row level security;
alter table public.wallet_accounts replica identity full;
alter table public.wallet_ledger  replica identity full;

drop policy if exists wallet_accounts_read on public.wallet_accounts;
create policy wallet_accounts_read on public.wallet_accounts for select to authenticated
  using (user_id = auth.uid() or public.is_staff(auth.uid()));

drop policy if exists wallet_ledger_read on public.wallet_ledger;
create policy wallet_ledger_read on public.wallet_ledger for select to authenticated
  using (user_id = auth.uid() or public.is_staff(auth.uid()));
-- écriture : uniquement via RPC (SECURITY DEFINER)

do $$ begin
  execute 'alter publication supabase_realtime add table public.wallet_accounts';
exception when duplicate_object then null; end $$;
do $$ begin
  execute 'alter publication supabase_realtime add table public.wallet_ledger';
exception when duplicate_object then null; end $$;

-- solde courant (0 si aucun compte)
create or replace function public.wallet_balance(p_user uuid default auth.uid())
returns numeric language sql stable security definer set search_path = public as $$
  select coalesce((select balance from public.wallet_accounts where user_id = p_user), 0);
$$;
grant execute on function public.wallet_balance(uuid) to authenticated;

-- mouvement de portefeuille (verrouille le compte, écrit le grand livre)
create or replace function public.wallet_apply(
  p_user uuid, p_kind text, p_amount numeric, p_payment uuid, p_note text
) returns numeric language plpgsql security definer set search_path = public as $$
declare v_bal numeric; v_next numeric; v_signed numeric;
begin
  insert into public.wallet_accounts (user_id) values (p_user)
    on conflict (user_id) do nothing;

  select balance into v_bal from public.wallet_accounts where user_id = p_user for update;
  v_signed := case when p_kind = 'spend' then -p_amount else p_amount end;
  v_next := v_bal + v_signed;
  if v_next < 0 then raise exception 'insufficient_balance'; end if;

  update public.wallet_accounts set balance = v_next, updated_at = now() where user_id = p_user;
  insert into public.wallet_ledger (user_id, kind, amount, balance_after, payment_id, note)
  values (p_user, p_kind, p_amount, v_next, p_payment, p_note);
  return v_next;
end $$;

-- un paiement « wallet » confirmé crédite le portefeuille
create or replace function public.on_payment_wallet_topup()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.purpose = 'wallet' and new.status = 'paid'
     and (old.status is distinct from 'paid')
     and not exists (select 1 from public.wallet_ledger where payment_id = new.id) then
    perform public.wallet_apply(new.payer_id, 'topup', new.amount, new.id, 'Recharge du compte');
  end if;
  return new;
end $$;

drop trigger if exists trg_payment_wallet_topup on public.payments;
create trigger trg_payment_wallet_topup
  after insert or update of status on public.payments
  for each row execute function public.on_payment_wallet_topup();

-- ---- RPC : recharge simulée ---------------------------------------
create or replace function public.wallet_topup_sim(p_amount numeric, p_method text, p_outcome text)
returns public.payments
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_pay public.payments; v_ref text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_outcome not in ('success','failed','pending') then raise exception 'bad_outcome'; end if;
  if p_amount is null or p_amount < 500 then raise exception 'amount_too_low'; end if;
  if p_method not in ('mtn','moov','celtis','card') then raise exception 'bad_method'; end if;

  v_ref := 'PAY-' || to_char(now(),'YYYYMMDD') || '-' ||
           lpad(nextval('public.payment_ref_seq')::text, 6, '0');

  insert into public.payments (internal_ref, provider, sim_outcome, purpose, payer_id,
    method, amount, currency, status, channel, paid_at)
  values (v_ref, 'sim', p_outcome, 'wallet', v_uid, p_method, round(p_amount), 'XOF',
    case p_outcome when 'success' then 'paid' when 'pending' then 'pending' else 'failed' end,
    'online', case when p_outcome = 'success' then now() end)
  returning * into v_pay;

  return v_pay;
end $$;
grant execute on function public.wallet_topup_sim(numeric, text, text) to authenticated;

-- ---- RPC : régler un frais avec le solde --------------------------
create or replace function public.wallet_pay_charge(p_charge uuid)
returns public.payments
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_chg public.reservation_charges; v_res public.reservations;
  v_pay public.payments; v_ref text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_chg from public.reservation_charges where id = p_charge;
  if not found then raise exception 'not_found'; end if;
  if v_chg.status <> 'pending' then raise exception 'already_settled'; end if;
  select * into v_res from public.reservations where id = v_chg.reservation_id;
  if v_res.guest_id <> v_uid then raise exception 'forbidden'; end if;
  if public.wallet_balance(v_uid) < v_chg.amount then raise exception 'insufficient_balance'; end if;

  v_ref := 'PAY-' || to_char(now(),'YYYYMMDD') || '-' ||
           lpad(nextval('public.payment_ref_seq')::text, 6, '0');

  insert into public.payments (internal_ref, provider, purpose, reservation_id, charge_id,
    payer_id, method, amount, currency, status, channel, paid_at)
  values (v_ref, 'sim', 'charge', v_res.id, v_chg.id, v_uid, 'card', v_chg.amount, v_chg.currency,
    'paid', 'wallet', now())
  returning * into v_pay;
  -- le trigger on_payment_settle_charge solde le frais

  perform public.wallet_apply(v_uid, 'spend', v_chg.amount, v_pay.id,
    'Règlement — ' || v_chg.label);

  return v_pay;
end $$;
grant execute on function public.wallet_pay_charge(uuid) to authenticated;

-- ---- RPC : régler le solde d'une réservation avec le portefeuille --
create or replace function public.wallet_pay_reservation(p_reservation uuid, p_amount numeric)
returns public.payments
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_res public.reservations; v_pay public.payments; v_ref text; v_due numeric;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_res from public.reservations where id = p_reservation;
  if not found or v_res.guest_id <> v_uid then raise exception 'not_your_reservation'; end if;
  if v_res.status not in ('pending_payment','confirmed','in_stay') then
    raise exception 'reservation_not_payable';
  end if;
  v_due := v_res.total_amount - v_res.amount_paid;
  if v_due <= 0 then raise exception 'nothing_to_pay'; end if;
  if p_amount is null or p_amount <= 0 or p_amount > v_due then raise exception 'bad_amount'; end if;
  if public.wallet_balance(v_uid) < p_amount then raise exception 'insufficient_balance'; end if;

  v_ref := 'PAY-' || to_char(now(),'YYYYMMDD') || '-' ||
           lpad(nextval('public.payment_ref_seq')::text, 6, '0');

  insert into public.payments (internal_ref, provider, purpose, reservation_id, payer_id,
    method, amount, currency, status, channel, paid_at)
  values (v_ref, 'sim', 'balance', v_res.id, v_uid, 'card', round(p_amount), 'XOF',
    'paid', 'wallet', now())
  returning * into v_pay;

  update public.reservations set
    amount_paid = amount_paid + v_pay.amount,
    status = case when status = 'pending_payment' then 'confirmed' else status end
  where id = v_res.id;
  insert into public.reservation_events (reservation_id, type, payload, actor_id)
  values (v_res.id, 'paid', jsonb_build_object('amount', v_pay.amount, 'payment', v_pay.id, 'channel', 'wallet'), v_uid);

  perform public.wallet_apply(v_uid, 'spend', v_pay.amount, v_pay.id, 'Règlement séjour ' || v_res.reference);

  return v_pay;
end $$;
grant execute on function public.wallet_pay_reservation(uuid, numeric) to authenticated;

-- =====================================================================
--  payment_submit_proof : accepte le motif « wallet » (recharge par preuve)
-- =====================================================================
create or replace function public.payment_submit_proof(
  p_purpose text, p_target uuid, p_method text, p_amount numeric,
  p_proof_path text, p_note text default null
) returns public.payments
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_res public.reservations; v_ord public.service_orders; v_chg public.reservation_charges;
  v_pay public.payments; v_ref text;
  v_reservation uuid; v_order uuid; v_charge uuid; v_purpose text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if coalesce(trim(p_proof_path),'') = '' then raise exception 'proof_required'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'bad_amount'; end if;

  if p_purpose in ('reservation','balance') then
    select * into v_res from public.reservations where id = p_target;
    if not found or v_res.guest_id <> v_uid then raise exception 'not_your_reservation'; end if;
    if not public.is_identity_verified(v_uid) then raise exception 'identity_not_verified'; end if;
    v_reservation := p_target;
    v_purpose := case when p_purpose = 'balance' then 'balance' else 'reservation' end;
  elsif p_purpose = 'service_order' then
    select * into v_ord from public.service_orders where id = p_target;
    if not found or v_ord.customer_id <> v_uid then raise exception 'not_your_order'; end if;
    v_order := p_target;
    v_purpose := 'service_order';
  elsif p_purpose = 'charge' then
    select * into v_chg from public.reservation_charges where id = p_target;
    if not found then raise exception 'not_found'; end if;
    select * into v_res from public.reservations where id = v_chg.reservation_id;
    if v_res.guest_id <> v_uid then raise exception 'forbidden'; end if;
    v_charge := p_target; v_reservation := v_res.id; v_purpose := 'charge';
  elsif p_purpose = 'wallet' then
    v_purpose := 'wallet';
  else
    raise exception 'unsupported_purpose';
  end if;

  v_ref := 'PAY-' || to_char(now(),'YYYYMMDD') || '-' ||
           lpad(nextval('public.payment_ref_seq')::text, 6, '0');

  insert into public.payments (
    internal_ref, provider, purpose, reservation_id, service_order_id, charge_id, payer_id,
    method, amount, status, channel, proof_path, proof_note
  ) values (
    v_ref, 'sim', v_purpose, v_reservation, v_order, v_charge,
    v_uid, p_method, p_amount, 'awaiting_review', 'proof', p_proof_path, p_note
  ) returning * into v_pay;

  perform public.notify_staff('payment', 'Preuve de paiement reçue',
    'Un client a joint une preuve de paiement à vérifier.',
    jsonb_build_object('payment_id', v_pay.id, 'reservation_id', v_pay.reservation_id));

  return v_pay;
end $$;
grant execute on function public.payment_submit_proof(text,uuid,text,numeric,text,text) to authenticated;

-- =====================================================================
--  RPC : l'équipe envoie les coordonnées de paiement dans la messagerie
-- =====================================================================
create or replace function public.staff_send_payment_details(
  p_reservation uuid, p_amount numeric default null, p_note text default null
) returns public.messages
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_res public.reservations;
  v_conv public.conversations;
  v_msg public.messages;
  v_instructions text;
  v_body text;
begin
  if not public.has_permission(v_uid, 'reservations.update') then raise exception 'forbidden'; end if;
  select * into v_res from public.reservations where id = p_reservation;
  if not found then raise exception 'reservation_not_found'; end if;

  select coalesce(manual_instructions, '') into v_instructions from public.payment_settings where id = 1;

  select * into v_conv from public.conversations
    where customer_id = v_res.guest_id
    order by (type = 'reservation' and reservation_id = p_reservation) desc, last_message_at desc
    limit 1;
  if not found then
    insert into public.conversations (subject, type, reservation_id, customer_id, assigned_staff_id)
    values ('Paiement — séjour ' || v_res.reference, 'reservation', p_reservation, v_res.guest_id, v_uid)
    returning * into v_conv;
  end if;

  v_body := 'Coordonnées pour votre paiement — séjour ' || v_res.reference || E'\n\n'
    || case when p_amount is not null and p_amount > 0
            then 'Montant à régler : ' || to_char(round(p_amount), 'FM999G999G999') || ' XOF' || E'\n\n'
            else '' end
    || v_instructions
    || case when coalesce(trim(p_note),'') <> '' then E'\n\n' || btrim(p_note) else '' end
    || E'\n\nUne fois le paiement effectué, répondez ici avec la capture d''écran : notre équipe la validera.';

  insert into public.messages (conversation_id, sender_id, body, system)
  values (v_conv.id, v_uid, v_body, false)
  returning * into v_msg;

  insert into public.notifications (user_id, type, title, body, data, channels)
  values (v_res.guest_id, 'payment', 'Coordonnées de paiement',
    'L''équipe vous a envoyé les informations pour régler votre séjour.',
    jsonb_build_object('conversation_id', v_conv.id, 'reservation_id', p_reservation),
    '{in_app,email,push}'::text[]);

  return v_msg;
end $$;
grant execute on function public.staff_send_payment_details(uuid, numeric, text) to authenticated;
