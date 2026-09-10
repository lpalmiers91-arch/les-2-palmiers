-- =====================================================================
--  Frais de séjour : caution, consommations (eau/électricité), ménage
--  supplémentaire, dégâts, divers. L'équipe crée le frais, le client est
--  notifié en temps réel et peut le régler (simulateur ou preuve de
--  paiement). Un reçu est disponible une fois réglé.
-- =====================================================================

create sequence if not exists public.charge_ref_seq;

create table if not exists public.reservation_charges (
  id             uuid primary key default gen_random_uuid(),
  reference      text not null unique default
                   'FR-' || to_char(now(),'YYYY') || '-' ||
                   lpad(nextval('public.charge_ref_seq')::text, 5, '0'),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  kind           text not null default 'other'
                   check (kind in ('deposit','utility','cleaning','damage','service','other')),
  label          text not null,
  amount         numeric not null check (amount > 0),
  currency       text not null default 'XOF',
  status         text not null default 'pending'
                   check (status in ('pending','paid','waived','refunded')),
  note           text,
  created_by     uuid references public.profiles(id) on delete set null,
  payment_id     uuid references public.payments(id) on delete set null,
  created_at     timestamptz not null default now(),
  paid_at        timestamptz,
  updated_at     timestamptz not null default now()
);
create index if not exists resv_charges_idx on public.reservation_charges(reservation_id, created_at desc);

alter table public.reservation_charges enable row level security;
alter table public.reservation_charges replica identity full;

drop policy if exists resv_charges_read on public.reservation_charges;
create policy resv_charges_read on public.reservation_charges for select to authenticated
  using (
    public.is_staff(auth.uid())
    or exists (select 1 from public.reservations r
               where r.id = reservation_id and r.guest_id = auth.uid())
  );
-- écriture : uniquement via RPC (SECURITY DEFINER)

-- lien paiement -> frais
alter table public.payments add column if not exists charge_id uuid
  references public.reservation_charges(id) on delete set null;

alter table public.payments drop constraint if exists payments_purpose_check;
alter table public.payments add constraint payments_purpose_check
  check (purpose = any (array['reservation', 'service_order', 'balance', 'gift_card', 'charge']));

-- quand un paiement lié à un frais passe « paid », le frais est soldé
create or replace function public.on_payment_settle_charge()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.charge_id is not null and new.status = 'paid'
     and (old.status is distinct from 'paid') then
    update public.reservation_charges
      set status = 'paid', payment_id = new.id, paid_at = coalesce(new.paid_at, now()), updated_at = now()
      where id = new.charge_id and status <> 'paid';
  end if;
  return new;
end $$;

drop trigger if exists trg_payment_settle_charge on public.payments;
create trigger trg_payment_settle_charge
  after insert or update of status on public.payments
  for each row execute function public.on_payment_settle_charge();

-- ---- RPC : l'équipe ajoute un frais -------------------------------------
create or replace function public.staff_add_charge(
  p_reservation uuid, p_kind text, p_label text, p_amount numeric, p_note text default null
) returns public.reservation_charges
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_res public.reservations;
  v_row public.reservation_charges;
begin
  if not public.has_permission(v_uid, 'reservations.update') then raise exception 'forbidden'; end if;
  if p_kind not in ('deposit','utility','cleaning','damage','service','other') then
    raise exception 'bad_kind';
  end if;
  if coalesce(trim(p_label),'') = '' then raise exception 'label_required'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'bad_amount'; end if;

  select * into v_res from public.reservations where id = p_reservation;
  if not found then raise exception 'reservation_not_found'; end if;

  insert into public.reservation_charges (reservation_id, kind, label, amount, note, created_by)
  values (p_reservation, p_kind, btrim(p_label), round(p_amount), nullif(btrim(p_note),''), v_uid)
  returning * into v_row;

  insert into public.notifications (user_id, type, title, body, data, channels)
  values (
    v_res.guest_id, 'charge',
    case v_row.kind
      when 'deposit'  then 'Caution demandée'
      when 'utility'  then 'Consommations à régler'
      when 'cleaning' then 'Ménage supplémentaire'
      when 'damage'   then 'Frais de remise en état'
      else 'Nouveau frais à régler'
    end,
    v_row.label || ' — ' || to_char(v_row.amount, 'FM999G999G999') || ' ' || v_row.currency
      || '. Réservation ' || v_res.reference || '.',
    jsonb_build_object('charge_id', v_row.id, 'reservation_id', v_res.id),
    '{in_app,email,push}'::text[]
  );

  return v_row;
end $$;
grant execute on function public.staff_add_charge(uuid, text, text, numeric, text) to authenticated;

-- ---- RPC : l'équipe change le statut d'un frais -----------------------
create or replace function public.staff_update_charge(p_charge uuid, p_status text)
returns public.reservation_charges
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_row public.reservation_charges;
  v_res public.reservations;
begin
  if not public.has_permission(v_uid, 'reservations.update') then raise exception 'forbidden'; end if;
  if p_status not in ('pending','paid','waived','refunded') then raise exception 'bad_status'; end if;

  update public.reservation_charges
    set status = p_status,
        paid_at = case when p_status = 'paid' then coalesce(paid_at, now()) else paid_at end,
        updated_at = now()
    where id = p_charge
    returning * into v_row;
  if not found then raise exception 'not_found'; end if;

  select * into v_res from public.reservations where id = v_row.reservation_id;
  if p_status in ('paid','waived','refunded') then
    insert into public.notifications (user_id, type, title, body, data, channels)
    values (
      v_res.guest_id, 'charge',
      case p_status when 'paid' then 'Frais réglé' when 'waived' then 'Frais annulé' else 'Frais remboursé' end,
      v_row.label || ' — ' || v_res.reference,
      jsonb_build_object('charge_id', v_row.id, 'reservation_id', v_res.id),
      '{in_app,push}'::text[]
    );
  end if;

  return v_row;
end $$;
grant execute on function public.staff_update_charge(uuid, text) to authenticated;

-- ---- RPC : le client règle un frais via le simulateur ---------------
create or replace function public.charge_pay_sim(p_charge uuid, p_method text, p_outcome text)
returns public.payments
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_row public.reservation_charges;
  v_res public.reservations;
  v_pay public.payments;
  v_ref text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_outcome not in ('success','failed','pending') then raise exception 'bad_outcome'; end if;

  select * into v_row from public.reservation_charges where id = p_charge;
  if not found then raise exception 'not_found'; end if;
  if v_row.status <> 'pending' then raise exception 'already_settled'; end if;

  select * into v_res from public.reservations where id = v_row.reservation_id;
  if v_res.guest_id <> v_uid then raise exception 'forbidden'; end if;

  v_ref := 'PAY-' || to_char(now(),'YYYYMMDD') || '-' ||
           lpad(nextval('public.payment_ref_seq')::text, 6, '0');

  insert into public.payments (
    internal_ref, provider, sim_outcome, purpose, reservation_id, charge_id, payer_id,
    method, amount, currency, status, channel, paid_at
  ) values (
    v_ref, 'sim', p_outcome, 'charge', v_res.id, v_row.id, v_uid,
    p_method, v_row.amount, v_row.currency,
    case p_outcome when 'success' then 'paid' when 'pending' then 'pending' else 'failed' end,
    'online',
    case when p_outcome = 'success' then now() end
  ) returning * into v_pay;

  return v_pay;
end $$;
grant execute on function public.charge_pay_sim(uuid, text, text) to authenticated;

-- ---- payment_submit_proof : accepte le motif « charge » -------------
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
