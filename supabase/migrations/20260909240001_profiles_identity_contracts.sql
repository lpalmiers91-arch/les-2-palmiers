-- Les 2 Palmiers — profil enrichi, vérification d'identité (KYC simulée),
-- contrats de séjour, présence. (Phase 9)
-- Réf. demande client : profil complet + photo, KYC validée par le staff,
-- contrat rempli/signé/téléchargeable, présence temps réel.

-- =====================================================================
--  1. Profil enrichi
-- =====================================================================

alter table public.profiles
  add column if not exists address       text,
  add column if not exists city          text,
  add column if not exists country       text,
  add column if not exists postal_code   text,
  add column if not exists date_of_birth date,
  add column if not exists nationality   text,
  add column if not exists bio           text,
  add column if not exists last_seen_at  timestamptz;

-- 10 langues prises en charge (l'arabe en RTL côté front)
alter table public.profiles drop constraint if exists profiles_locale_check;
alter table public.profiles alter column locale set default 'fr';
alter table public.profiles add constraint profiles_locale_check
  check (locale in ('fr','en','es','zh','ar','pt','de','it','ru','ja'));

-- battement de présence : le client appelle ceci périodiquement
create or replace function public.heartbeat()
returns void language sql security definer set search_path = public as $$
  update public.profiles set last_seen_at = now() where id = auth.uid();
$$;
grant execute on function public.heartbeat() to authenticated;

-- =====================================================================
--  2. Permission "identity.review"
-- =====================================================================

insert into public.permissions (key, label, description) values
  ('identity.review', 'Vérifier les identités', 'Valider ou refuser les pièces d''identité soumises par les clients.')
on conflict (key) do update set label = excluded.label, description = excluded.description;

insert into public.role_permissions (role_id, permission_key) values
  ('admin','identity.review'),
  ('staff','identity.review'),
  ('coordinator','identity.review')
on conflict do nothing;

-- =====================================================================
--  3. Vérification d'identité (KYC simulée — validée par le staff)
-- =====================================================================

create table public.identity_verifications (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  status              text not null default 'pending'
                        check (status in ('pending','approved','rejected')),
  legal_full_name     text not null,
  date_of_birth       date,
  nationality         text,
  document_type       text not null
                        check (document_type in ('id_card','passport','residence_permit','drivers_license')),
  document_number     text not null,
  document_expiry     date,
  selfie_path         text not null,          -- bucket privé identity-docs
  document_front_path text not null,
  document_back_path  text,
  submitted_at        timestamptz not null default now(),
  reviewed_by         uuid references public.profiles(id),
  reviewed_at         timestamptz,
  rejection_reason    text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
comment on table public.identity_verifications is
  'Dossiers KYC. En démo, la validation est manuelle (staff). Un seul dossier actif par client.';

-- au plus un dossier "vivant" (en attente ou approuvé) par client
create unique index identity_verifications_one_active
  on public.identity_verifications(user_id)
  where status in ('pending','approved');

create index identity_verifications_status_idx
  on public.identity_verifications(status, submitted_at);

create trigger trg_identity_verifications_updated_at
  before update on public.identity_verifications
  for each row execute function public.set_updated_at();

create or replace function public.is_identity_verified(uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.identity_verifications
    where user_id = uid and status = 'approved'
  );
$$;
grant execute on function public.is_identity_verified(uuid) to authenticated;

-- statut KYC courant d'un client (pour l'affichage) : approved > pending > rejected > none
create or replace function public.identity_status(uid uuid)
returns text language sql stable security definer set search_path = public as $$
  select coalesce(
    (select status from public.identity_verifications
       where user_id = uid
       order by (status = 'approved') desc, (status = 'pending') desc, submitted_at desc
       limit 1),
    'none');
$$;
grant execute on function public.identity_status(uuid) to authenticated;

-- ---- RPC : soumettre / re-soumettre un dossier -----------------------
create or replace function public.submit_identity_verification(
  p_legal_full_name text,
  p_date_of_birth date,
  p_nationality text,
  p_document_type text,
  p_document_number text,
  p_document_expiry date,
  p_selfie_path text,
  p_document_front_path text,
  p_document_back_path text default null
) returns public.identity_verifications
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_row public.identity_verifications;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if coalesce(trim(p_legal_full_name),'') = '' then raise exception 'name_required'; end if;
  if coalesce(trim(p_document_number),'') = '' then raise exception 'document_number_required'; end if;
  if coalesce(trim(p_selfie_path),'') = '' or coalesce(trim(p_document_front_path),'') = '' then
    raise exception 'documents_required';
  end if;

  if public.is_identity_verified(v_uid) then raise exception 'already_verified'; end if;

  -- dossier en attente existant -> on le remplace (nouvelle soumission)
  select * into v_row from public.identity_verifications
    where user_id = v_uid and status = 'pending' limit 1;

  if found then
    update public.identity_verifications set
      legal_full_name = p_legal_full_name,
      date_of_birth = p_date_of_birth,
      nationality = p_nationality,
      document_type = p_document_type,
      document_number = p_document_number,
      document_expiry = p_document_expiry,
      selfie_path = p_selfie_path,
      document_front_path = p_document_front_path,
      document_back_path = p_document_back_path,
      submitted_at = now(),
      updated_at = now()
    where id = v_row.id
    returning * into v_row;
  else
    insert into public.identity_verifications (
      user_id, legal_full_name, date_of_birth, nationality, document_type,
      document_number, document_expiry, selfie_path, document_front_path, document_back_path
    ) values (
      v_uid, p_legal_full_name, p_date_of_birth, p_nationality, p_document_type,
      p_document_number, p_document_expiry, p_selfie_path, p_document_front_path, p_document_back_path
    ) returning * into v_row;
  end if;

  update public.profiles set
    date_of_birth = coalesce(date_of_birth, p_date_of_birth),
    nationality   = coalesce(nationality, p_nationality)
  where id = v_uid;

  perform public.notify_staff(
    'identity',
    'Nouvelle vérification d''identité',
    'Un client a soumis sa pièce d''identité pour validation.',
    jsonb_build_object('verification_id', v_row.id, 'user_id', v_uid)
  );

  return v_row;
end;
$$;
grant execute on function public.submit_identity_verification(text,date,text,text,text,date,text,text,text) to authenticated;

-- ---- RPC : décision du staff ---------------------------------------
create or replace function public.review_identity_verification(
  p_id uuid, p_decision text, p_reason text default null
) returns public.identity_verifications
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_row public.identity_verifications;
begin
  if not public.has_permission(v_uid,'identity.review') then raise exception 'forbidden'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'bad_decision'; end if;

  select * into v_row from public.identity_verifications where id = p_id for update;
  if not found then raise exception 'not_found'; end if;
  if v_row.status <> 'pending' then raise exception 'already_reviewed'; end if;
  if p_decision = 'rejected' and coalesce(trim(p_reason),'') = '' then
    raise exception 'reason_required';
  end if;

  update public.identity_verifications set
    status = p_decision,
    reviewed_by = v_uid,
    reviewed_at = now(),
    rejection_reason = case when p_decision = 'rejected' then p_reason end,
    updated_at = now()
  where id = p_id
  returning * into v_row;

  insert into public.notifications (user_id, type, title, body, data)
  values (
    v_row.user_id,
    'identity',
    case when p_decision = 'approved'
         then 'Identité vérifiée'
         else 'Vérification d''identité refusée' end,
    case when p_decision = 'approved'
         then 'Votre identité est confirmée. Vous pouvez finaliser vos réservations.'
         else coalesce(p_reason, 'Merci de soumettre à nouveau des documents lisibles.') end,
    jsonb_build_object('verification_id', v_row.id, 'status', p_decision)
  );

  insert into public.audit_log (actor_id, action, entity, entity_id, after)
  values (v_uid, 'identity.' || p_decision, 'identity_verification', v_row.id::text,
          jsonb_build_object('reason', p_reason, 'user_id', v_row.user_id));

  return v_row;
end;
$$;
grant execute on function public.review_identity_verification(uuid,text,text) to authenticated;

-- =====================================================================
--  4. Contrats de séjour
-- =====================================================================

create sequence public.contract_ref_seq;

create table public.contracts (
  id                    uuid primary key default gen_random_uuid(),
  reference             text unique not null,
  reservation_id        uuid references public.reservations(id) on delete cascade,
  client_id             uuid not null references public.profiles(id) on delete cascade,
  status                text not null default 'draft'
                          check (status in ('draft','signed','countersigned','cancelled')),
  template_version      text not null default 'v1',
  terms                 jsonb not null default '{}'::jsonb,   -- instantané : dates, montants, champs remplis
  client_signature_name text,
  client_signed_at      timestamptz,
  countersigned_by      uuid references public.profiles(id),
  staff_signature_name  text,
  countersigned_at      timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index contracts_client_idx on public.contracts(client_id);
create index contracts_reservation_idx on public.contracts(reservation_id);

create trigger trg_contracts_updated_at
  before update on public.contracts
  for each row execute function public.set_updated_at();

-- un contrat brouillon est créé automatiquement pour chaque réservation
create or replace function public.on_reservation_make_contract()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_apt public.apartments;
begin
  select * into v_apt from public.apartments where id = new.apartment_id;
  insert into public.contracts (reference, reservation_id, client_id, terms)
  values (
    'CT-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.contract_ref_seq')::text, 5, '0'),
    new.id, new.guest_id,
    jsonb_build_object(
      'reservation_reference', new.reference,
      'apartment', coalesce(v_apt.name, 'Appartement'),
      'address', v_apt.address,
      'checkin', lower(new.date_range),
      'checkout', upper(new.date_range),
      'nights', new.nights,
      'guests', new.guests_count,
      'total_amount', new.total_amount,
      'deposit_amount', new.deposit_amount,
      'currency', new.currency
    )
  );
  return new;
end;
$$;

create trigger trg_reservations_make_contract
  after insert on public.reservations
  for each row execute function public.on_reservation_make_contract();

-- ---- RPC : le client remplit et signe -----------------------------
create or replace function public.sign_contract(
  p_contract uuid, p_signature_name text, p_fields jsonb default '{}'::jsonb
) returns public.contracts
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_row public.contracts;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if coalesce(trim(p_signature_name),'') = '' then raise exception 'signature_required'; end if;

  select * into v_row from public.contracts where id = p_contract for update;
  if not found then raise exception 'not_found'; end if;
  if v_row.client_id <> v_uid then raise exception 'forbidden'; end if;
  if v_row.status not in ('draft') then raise exception 'already_signed'; end if;

  update public.contracts set
    status = 'signed',
    terms = v_row.terms || coalesce(p_fields, '{}'::jsonb),
    client_signature_name = p_signature_name,
    client_signed_at = now(),
    updated_at = now()
  where id = p_contract
  returning * into v_row;

  perform public.notify_staff(
    'contract',
    'Contrat signé par un client',
    'Le contrat ' || v_row.reference || ' vient d''être signé.',
    jsonb_build_object('contract_id', v_row.id, 'reservation_id', v_row.reservation_id)
  );

  return v_row;
end;
$$;
grant execute on function public.sign_contract(uuid,text,jsonb) to authenticated;

-- ---- RPC : contreseing du staff -----------------------------------
create or replace function public.countersign_contract(
  p_contract uuid, p_signature_name text
) returns public.contracts
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_row public.contracts;
begin
  if not public.has_permission(v_uid,'reservations.update') then raise exception 'forbidden'; end if;
  if coalesce(trim(p_signature_name),'') = '' then raise exception 'signature_required'; end if;

  select * into v_row from public.contracts where id = p_contract for update;
  if not found then raise exception 'not_found'; end if;
  if v_row.status <> 'signed' then raise exception 'not_signed_yet'; end if;

  update public.contracts set
    status = 'countersigned',
    countersigned_by = v_uid,
    staff_signature_name = p_signature_name,
    countersigned_at = now(),
    updated_at = now()
  where id = p_contract
  returning * into v_row;

  insert into public.notifications (user_id, type, title, body, data)
  values (v_row.client_id, 'contract', 'Contrat contresigné',
          'Votre contrat ' || v_row.reference || ' est finalisé.',
          jsonb_build_object('contract_id', v_row.id));

  return v_row;
end;
$$;
grant execute on function public.countersign_contract(uuid,text) to authenticated;

-- =====================================================================
--  5. Garde-fou paiement : identité vérifiée exigée pour une réservation
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
    if not public.is_identity_verified(v_uid) then raise exception 'identity_not_verified'; end if;
    if v_res.status not in ('pending_payment','confirmed','in_stay') then
      raise exception 'reservation_not_payable';
    end if;
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

-- =====================================================================
--  6. RLS
-- =====================================================================

alter table public.identity_verifications enable row level security;
alter table public.contracts              enable row level security;

-- KYC : le client voit/gère le sien (via RPC) ; le staff identity.review voit tout.
create policy identity_select on public.identity_verifications for select to authenticated
  using (user_id = auth.uid() or public.has_permission(auth.uid(),'identity.review'));

-- contrats : le client voit les siens ; le staff reservations.view voit tout.
create policy contracts_select on public.contracts for select to authenticated
  using (client_id = auth.uid() or public.has_permission(auth.uid(),'reservations.view'));

-- =====================================================================
--  7. Realtime
-- =====================================================================

alter publication supabase_realtime add table public.identity_verifications;
alter publication supabase_realtime add table public.contracts;

-- =====================================================================
--  8. GRANTS
-- =====================================================================

grant select on public.identity_verifications, public.contracts to authenticated;
grant execute on function public.payment_init(text, uuid, text) to authenticated;
