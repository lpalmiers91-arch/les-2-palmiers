-- =====================================================================
--  Les 2 Palmiers — Extension plateforme (Phase 10)
--  - permissions opérationnelles au staff (admin = superviseur)
--  - infos séjour (codes wifi) par appartement
--  - avis clients
--  - fidélité (points + paliers)
--  - paiement : preuve de paiement + validation staff
--  - CMS : pages / blocs / apparence
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Permissions
-- ---------------------------------------------------------------------
insert into public.permissions (key, label, description) values
  ('cms.edit',         'Éditer le site',            'Modifier les pages, sections, textes, images, apparence.'),
  ('loyalty.edit',     'Configurer la fidélité',      'Définir les paliers, le barème de points, les avantages.'),
  ('reviews.moderate', 'Modérer les avis',           'Publier, masquer ou répondre aux avis clients.'),
  ('stay.edit',        'Éditer les infos séjour',    'Codes wifi, manuel de la maison, consignes d''arrivée.')
on conflict (key) do update set label = excluded.label, description = excluded.description;

-- admin : toutes (déjà le cas, on réassure)
insert into public.role_permissions (role_id, permission_key)
select 'admin', key from public.permissions
on conflict do nothing;

-- staff : toute la config opérationnelle
insert into public.role_permissions (role_id, permission_key) values
  ('staff','catalog.edit'), ('staff','pricing.edit'), ('staff','apartments.edit'),
  ('staff','media.edit'), ('staff','availability.edit'), ('staff','settings.edit'),
  ('staff','ai.configure'), ('staff','cms.edit'), ('staff','loyalty.edit'),
  ('staff','reviews.moderate'), ('staff','stay.edit'), ('staff','reports.view')
on conflict do nothing;

-- coordinator : garde son périmètre + avis
insert into public.role_permissions (role_id, permission_key) values
  ('coordinator','reviews.moderate')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 2. Infos séjour (codes wifi, manuel) par appartement
-- ---------------------------------------------------------------------
create table if not exists public.stay_info (
  apartment_id     uuid primary key references public.apartments(id) on delete cascade,
  wifi_ssid        text,
  wifi_password    text,
  house_manual     text,
  checkin_notes    text,
  checkout_notes   text,
  emergency_contact text,
  extras           jsonb not null default '[]'::jsonb,   -- [{label, value}]
  updated_by       uuid references public.profiles(id),
  updated_at       timestamptz not null default now()
);

create or replace function public.set_updated_at_stayinfo()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_stay_info_updated on public.stay_info;
create trigger trg_stay_info_updated before update on public.stay_info
  for each row execute function public.set_updated_at_stayinfo();

alter table public.stay_info enable row level security;

-- le client voit les infos séjour d'un appartement où il a une réservation vivante
create or replace function public.can_see_stay_info(aid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff(auth.uid())
      or exists (
        select 1 from public.reservations r
        where r.apartment_id = aid and r.guest_id = auth.uid()
          and r.status in ('pending_payment','confirmed','in_stay','completed')
      );
$$;
grant execute on function public.can_see_stay_info(uuid) to authenticated;

create policy stay_info_read on public.stay_info for select to authenticated
  using (public.can_see_stay_info(apartment_id));
create policy stay_info_write on public.stay_info for all to authenticated
  using (public.has_permission(auth.uid(),'stay.edit'))
  with check (public.has_permission(auth.uid(),'stay.edit'));

-- ---------------------------------------------------------------------
-- 3. Avis clients
-- ---------------------------------------------------------------------
create sequence if not exists public.review_ref_seq;

create table if not exists public.reviews (
  id             uuid primary key default gen_random_uuid(),
  reservation_id uuid references public.reservations(id) on delete set null,
  apartment_id   uuid references public.apartments(id) on delete set null,
  client_id      uuid not null references public.profiles(id) on delete cascade,
  rating         int not null check (rating between 1 and 5),
  title          text,
  body           text not null default '',
  status         text not null default 'pending' check (status in ('pending','published','hidden')),
  featured       boolean not null default false,   -- mis en avant sur l'accueil
  staff_reply    text,
  staff_reply_by uuid references public.profiles(id),
  staff_reply_at timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists reviews_status_idx on public.reviews(status, created_at desc);
create unique index if not exists reviews_one_per_reservation
  on public.reviews(reservation_id) where reservation_id is not null;

drop trigger if exists trg_reviews_updated on public.reviews;
create trigger trg_reviews_updated before update on public.reviews
  for each row execute function public.set_updated_at();

alter table public.reviews enable row level security;

-- lecture : avis publiés = tout le monde (même anon) ; le client voit les siens ; le staff voit tout
create policy reviews_read_published on public.reviews for select
  using (status = 'published' or client_id = auth.uid() or public.has_permission(auth.uid(),'reviews.moderate'));
create policy reviews_moderate on public.reviews for update to authenticated
  using (public.has_permission(auth.uid(),'reviews.moderate'))
  with check (public.has_permission(auth.uid(),'reviews.moderate'));

grant select on public.reviews to anon, authenticated;
grant update on public.reviews to authenticated;

-- RPC : le client dépose un avis (uniquement s'il a une réservation confirmée/terminée)
create or replace function public.submit_review(
  p_reservation uuid, p_rating int, p_title text, p_body text
) returns public.reviews
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_res public.reservations;
  v_row public.reviews;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_rating not between 1 and 5 then raise exception 'bad_rating'; end if;

  select * into v_res from public.reservations where id = p_reservation;
  if not found or v_res.guest_id <> v_uid then raise exception 'not_your_reservation'; end if;
  if v_res.status not in ('confirmed','in_stay','completed') then
    raise exception 'reservation_not_reviewable';
  end if;

  insert into public.reviews (reservation_id, apartment_id, client_id, rating, title, body)
  values (p_reservation, v_res.apartment_id, v_uid, p_rating, nullif(trim(p_title),''), coalesce(p_body,''))
  on conflict (reservation_id) do update
    set rating = excluded.rating, title = excluded.title, body = excluded.body,
        status = 'pending', updated_at = now()
  returning * into v_row;

  perform public.notify_staff('review', 'Nouvel avis client',
    'Note ' || p_rating || '/5 en attente de modération.',
    jsonb_build_object('review_id', v_row.id));

  return v_row;
end $$;
grant execute on function public.submit_review(uuid,int,text,text) to authenticated;

-- RPC : modération
create or replace function public.moderate_review(
  p_id uuid, p_status text, p_featured boolean default null, p_reply text default null
) returns public.reviews
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_row public.reviews;
begin
  if not public.has_permission(v_uid,'reviews.moderate') then raise exception 'forbidden'; end if;
  if p_status not in ('pending','published','hidden') then raise exception 'bad_status'; end if;

  update public.reviews set
    status = p_status,
    featured = coalesce(p_featured, featured),
    staff_reply = coalesce(nullif(trim(p_reply),''), staff_reply),
    staff_reply_by = case when nullif(trim(p_reply),'') is not null then v_uid else staff_reply_by end,
    staff_reply_at = case when nullif(trim(p_reply),'') is not null then now() else staff_reply_at end,
    updated_at = now()
  where id = p_id
  returning * into v_row;
  if not found then raise exception 'not_found'; end if;

  if p_status = 'published' then
    insert into public.notifications (user_id, type, title, body, data)
    values (v_row.client_id, 'review', 'Votre avis est publié', 'Merci pour votre retour !',
            jsonb_build_object('review_id', v_row.id));
    perform public.loyalty_award(v_row.client_id, 'review', v_row.id::text);
  end if;
  return v_row;
end $$;
grant execute on function public.moderate_review(uuid,text,boolean,text) to authenticated;

-- ---------------------------------------------------------------------
-- 4. Fidélité
-- ---------------------------------------------------------------------
create table if not exists public.loyalty_settings (
  id                integer primary key default 1 check (id = 1),
  enabled           boolean not null default true,
  currency_per_point numeric not null default 1000,   -- 1 point par 1000 XOF dépensés
  signup_bonus      int not null default 100,
  review_bonus      int not null default 50,
  tiers             jsonb not null default
    '[{"name":"Découverte","min_points":0,"perk":"Bienvenue"},
      {"name":"Habitué","min_points":500,"perk":"Arrivée anticipée selon dispo"},
      {"name":"Privilège","min_points":1500,"perk":"Transfert aéroport offert"},
      {"name":"Signature","min_points":4000,"perk":"Sur-classement & accueil personnalisé"}]'::jsonb,
  updated_by        uuid references public.profiles(id),
  updated_at        timestamptz not null default now()
);
insert into public.loyalty_settings (id) values (1) on conflict do nothing;

create table if not exists public.loyalty_accounts (
  client_id       uuid primary key references public.profiles(id) on delete cascade,
  points          int not null default 0,
  lifetime_points int not null default 0,
  tier            text not null default 'Découverte',
  updated_at      timestamptz not null default now()
);

create table if not exists public.loyalty_ledger (
  id         bigint generated always as identity primary key,
  client_id  uuid not null references public.profiles(id) on delete cascade,
  delta      int not null,
  reason     text not null,            -- reservation | service | review | signup | manual | redeem
  ref        text,
  note       text,
  actor_id   uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists loyalty_ledger_client_idx on public.loyalty_ledger(client_id, created_at desc);

create or replace function public.loyalty_tier_for(pts int)
returns text language sql stable set search_path = public as $$
  select coalesce(
    (select t->>'name' from public.loyalty_settings s,
       jsonb_array_elements(s.tiers) t
     where (t->>'min_points')::int <= pts
     order by (t->>'min_points')::int desc limit 1),
    'Découverte');
$$;

-- coeur : crédite/débite des points, met à jour le compte
create or replace function public.loyalty_post(
  p_client uuid, p_delta int, p_reason text, p_ref text default null,
  p_note text default null, p_actor uuid default null
) returns void language plpgsql security definer set search_path = public as $$
declare v_pts int;
begin
  if p_delta = 0 then return; end if;
  insert into public.loyalty_ledger (client_id, delta, reason, ref, note, actor_id)
  values (p_client, p_delta, p_reason, p_ref, p_note, coalesce(p_actor, auth.uid()));

  insert into public.loyalty_accounts (client_id, points, lifetime_points, tier)
  values (p_client, greatest(0, p_delta), greatest(0, p_delta), public.loyalty_tier_for(greatest(0,p_delta)))
  on conflict (client_id) do update set
    points = greatest(0, loyalty_accounts.points + p_delta),
    lifetime_points = loyalty_accounts.lifetime_points + greatest(0, p_delta),
    updated_at = now();

  select points into v_pts from public.loyalty_accounts where client_id = p_client;
  update public.loyalty_accounts set tier = public.loyalty_tier_for(v_pts) where client_id = p_client;
end $$;

-- award "intelligent" (ne double pas pour une même réf)
create or replace function public.loyalty_award(p_client uuid, p_reason text, p_ref text)
returns void language plpgsql security definer set search_path = public as $$
declare v_s public.loyalty_settings; v_delta int := 0;
begin
  select * into v_s from public.loyalty_settings where id = 1;
  if not v_s.enabled then return; end if;
  if exists (select 1 from public.loyalty_ledger where client_id = p_client and reason = p_reason and ref = p_ref) then
    return;
  end if;
  if p_reason = 'signup' then v_delta := v_s.signup_bonus;
  elsif p_reason = 'review' then v_delta := v_s.review_bonus;
  end if;
  if v_delta > 0 then perform public.loyalty_post(p_client, v_delta, p_reason, p_ref); end if;
end $$;

-- award sur paiement encaissé (appelé par payment_resolve / payment_review_proof)
create or replace function public.loyalty_award_payment(p_payment uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_s public.loyalty_settings; v_p public.payments; v_delta int;
begin
  select * into v_s from public.loyalty_settings where id = 1;
  if not v_s.enabled or v_s.currency_per_point <= 0 then return; end if;
  select * into v_p from public.payments where id = p_payment;
  if not found or v_p.status <> 'paid' then return; end if;
  if v_p.purpose not in ('reservation','balance','service_order') then return; end if;
  if exists (select 1 from public.loyalty_ledger where reason = 'payment' and ref = p_payment::text) then return; end if;
  v_delta := floor(v_p.amount / v_s.currency_per_point);
  if v_delta > 0 then
    perform public.loyalty_post(v_p.payer_id, v_delta, 'payment', p_payment::text,
      to_char(v_p.amount,'FM999G999') || ' ' || v_p.currency);
  end if;
end $$;

alter table public.loyalty_settings enable row level security;
alter table public.loyalty_accounts enable row level security;
alter table public.loyalty_ledger   enable row level security;

create policy loyalty_settings_read on public.loyalty_settings for select to authenticated using (true);
create policy loyalty_settings_write on public.loyalty_settings for all to authenticated
  using (public.has_permission(auth.uid(),'loyalty.edit'))
  with check (public.has_permission(auth.uid(),'loyalty.edit'));

create policy loyalty_accounts_read on public.loyalty_accounts for select to authenticated
  using (client_id = auth.uid() or public.is_staff(auth.uid()));
create policy loyalty_ledger_read on public.loyalty_ledger for select to authenticated
  using (client_id = auth.uid() or public.is_staff(auth.uid()));

grant select on public.loyalty_settings, public.loyalty_accounts, public.loyalty_ledger to authenticated;
grant update, insert on public.loyalty_settings to authenticated;

-- ajustement manuel par le staff
create or replace function public.loyalty_adjust(p_client uuid, p_delta int, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_permission(auth.uid(),'loyalty.edit') then raise exception 'forbidden'; end if;
  perform public.loyalty_post(p_client, p_delta, 'manual', null, p_note, auth.uid());
end $$;
grant execute on function public.loyalty_adjust(uuid,int,text) to authenticated;

-- bonus d'inscription
create or replace function public.on_new_user_loyalty()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.loyalty_award(new.id, 'signup', new.id::text);
  return new;
end $$;
drop trigger if exists trg_profile_loyalty on public.profiles;
create trigger trg_profile_loyalty after insert on public.profiles
  for each row execute function public.on_new_user_loyalty();

-- ---------------------------------------------------------------------
-- 5. Paiement : preuve de paiement
-- ---------------------------------------------------------------------
alter table public.payments
  add column if not exists channel     text not null default 'online' check (channel in ('online','proof')),
  add column if not exists proof_path   text,
  add column if not exists proof_note   text,
  add column if not exists reviewed_by  uuid references public.profiles(id),
  add column if not exists reviewed_at  timestamptz,
  add column if not exists review_note  text;

alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check
  check (status in ('pending','awaiting_review','paid','failed','refunded','partially_refunded','rejected'));

-- RPC : le client déclare avoir payé hors app et joint une preuve
create or replace function public.payment_submit_proof(
  p_purpose text, p_target uuid, p_method text, p_amount numeric,
  p_proof_path text, p_note text default null
) returns public.payments
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_res public.reservations; v_ord public.service_orders;
  v_pay public.payments; v_ref text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if coalesce(trim(p_proof_path),'') = '' then raise exception 'proof_required'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'bad_amount'; end if;

  if p_purpose in ('reservation','balance') then
    select * into v_res from public.reservations where id = p_target;
    if not found or v_res.guest_id <> v_uid then raise exception 'not_your_reservation'; end if;
    if not public.is_identity_verified(v_uid) then raise exception 'identity_not_verified'; end if;
  elsif p_purpose = 'service_order' then
    select * into v_ord from public.service_orders where id = p_target;
    if not found or v_ord.customer_id <> v_uid then raise exception 'not_your_order'; end if;
  else
    raise exception 'unsupported_purpose';
  end if;

  v_ref := 'PAY-' || to_char(now(),'YYYYMMDD') || '-' ||
           lpad(nextval('public.payment_ref_seq')::text, 6, '0');

  insert into public.payments (
    internal_ref, provider, purpose, reservation_id, service_order_id, payer_id,
    method, amount, status, channel, proof_path, proof_note
  ) values (
    v_ref, 'sim',
    case when p_purpose = 'balance' then 'balance' else p_purpose end,
    case when p_purpose in ('reservation','balance') then p_target end,
    case when p_purpose = 'service_order' then p_target end,
    v_uid, p_method, p_amount, 'awaiting_review', 'proof', p_proof_path, p_note
  ) returning * into v_pay;

  perform public.notify_staff('payment', 'Preuve de paiement reçue',
    'Un client a joint une preuve de paiement à vérifier.',
    jsonb_build_object('payment_id', v_pay.id, 'reservation_id', v_pay.reservation_id));

  return v_pay;
end $$;
grant execute on function public.payment_submit_proof(text,uuid,text,numeric,text,text) to authenticated;

-- RPC : le staff valide / refuse la preuve
create or replace function public.payment_review_proof(
  p_payment uuid, p_decision text, p_note text default null
) returns public.payments
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_pay public.payments;
begin
  if not public.has_permission(v_uid,'payments.view') then raise exception 'forbidden'; end if;
  if p_decision not in ('approve','reject') then raise exception 'bad_decision'; end if;

  select * into v_pay from public.payments where id = p_payment for update;
  if not found then raise exception 'not_found'; end if;
  if v_pay.status <> 'awaiting_review' then raise exception 'not_pending'; end if;

  update public.payments set
    status = case when p_decision = 'approve' then 'paid' else 'rejected' end,
    paid_at = case when p_decision = 'approve' then now() end,
    reviewed_by = v_uid, reviewed_at = now(), review_note = p_note,
    updated_at = now()
  where id = p_payment returning * into v_pay;

  if p_decision = 'approve' then
    if v_pay.reservation_id is not null then
      update public.reservations set
        amount_paid = amount_paid + v_pay.amount,
        status = case when status = 'pending_payment' then 'confirmed' else status end
      where id = v_pay.reservation_id;
      insert into public.reservation_events (reservation_id, type, payload, actor_id)
      values (v_pay.reservation_id, 'paid',
              jsonb_build_object('amount', v_pay.amount, 'payment', v_pay.id, 'channel','proof'), v_uid);
    elsif v_pay.service_order_id is not null then
      update public.service_orders set amount_paid = amount_paid + v_pay.amount
      where id = v_pay.service_order_id;
    end if;
    perform public.loyalty_award_payment(v_pay.id);
    insert into public.notifications (user_id, type, title, body, data)
    values (v_pay.payer_id, 'payment', 'Paiement confirmé',
            'Votre preuve de paiement a été validée.', jsonb_build_object('payment_id', v_pay.id));
  else
    insert into public.notifications (user_id, type, title, body, data)
    values (v_pay.payer_id, 'payment', 'Preuve de paiement refusée',
            coalesce(p_note,'Merci de renvoyer une preuve lisible.'), jsonb_build_object('payment_id', v_pay.id));
  end if;

  return v_pay;
end $$;
grant execute on function public.payment_review_proof(uuid,text,text) to authenticated;

-- award points aussi sur les paiements en ligne
create or replace function public.payment_resolve(p_payment uuid, p_outcome text)
returns public.payments
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_pay public.payments;
begin
  select * into v_pay from public.payments where id = p_payment for update;
  if not found then raise exception 'payment_not_found'; end if;
  if v_pay.payer_id <> v_uid and not public.has_permission(v_uid,'payments.view') then
    raise exception 'forbidden';
  end if;
  if v_pay.status <> 'pending' then return v_pay; end if;
  if p_outcome not in ('success','failure','pending') then raise exception 'bad_outcome'; end if;
  if p_outcome = 'pending' then return v_pay; end if;

  update public.payments set
    status = case when p_outcome = 'success' then 'paid' else 'failed' end,
    sim_outcome = p_outcome,
    paid_at = case when p_outcome = 'success' then now() end,
    raw_webhook = jsonb_build_object('sim', true, 'outcome', p_outcome, 'at', now()),
    updated_at = now()
  where id = p_payment returning * into v_pay;

  if p_outcome = 'success' then
    if v_pay.purpose = 'reservation' or v_pay.purpose = 'balance' then
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
    perform public.loyalty_award_payment(v_pay.id);
  end if;
  return v_pay;
end $$;
grant execute on function public.payment_resolve(uuid, text) to authenticated;

-- ---------------------------------------------------------------------
-- 6. CMS : pages + blocs + apparence
-- ---------------------------------------------------------------------
create table if not exists public.site_pages (
  id         uuid primary key default gen_random_uuid(),
  slug       text unique not null,
  title      text not null,
  nav_label  text,
  in_nav     boolean not null default false,
  nav_order  int not null default 0,
  status     text not null default 'draft' check (status in ('draft','published')),
  seo        jsonb not null default '{}'::jsonb,
  is_system  boolean not null default false,     -- page "/" non supprimable
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.site_blocks (
  id         uuid primary key default gen_random_uuid(),
  page_id    uuid not null references public.site_pages(id) on delete cascade,
  type       text not null,          -- hero | rich_text | gallery | services | tourism | reviews | cta | faq | ...
  position   int not null default 0,
  visible    boolean not null default true,
  content    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists site_blocks_page_idx on public.site_blocks(page_id, position);

drop trigger if exists trg_site_pages_updated on public.site_pages;
create trigger trg_site_pages_updated before update on public.site_pages
  for each row execute function public.set_updated_at();
drop trigger if exists trg_site_blocks_updated on public.site_blocks;
create trigger trg_site_blocks_updated before update on public.site_blocks
  for each row execute function public.set_updated_at();

alter table public.site_pages  enable row level security;
alter table public.site_blocks enable row level security;

-- lecture publique des pages/blocs publiés ; le staff voit tout
create policy site_pages_read on public.site_pages for select
  using (status = 'published' or public.has_permission(auth.uid(),'cms.edit'));
create policy site_pages_write on public.site_pages for all to authenticated
  using (public.has_permission(auth.uid(),'cms.edit')) with check (public.has_permission(auth.uid(),'cms.edit'));

create policy site_blocks_read on public.site_blocks for select
  using (
    public.has_permission(auth.uid(),'cms.edit')
    or exists (select 1 from public.site_pages p where p.id = page_id and p.status = 'published')
  );
create policy site_blocks_write on public.site_blocks for all to authenticated
  using (public.has_permission(auth.uid(),'cms.edit')) with check (public.has_permission(auth.uid(),'cms.edit'));

grant select on public.site_pages, public.site_blocks to anon, authenticated;
grant insert, update, delete on public.site_pages, public.site_blocks to authenticated;

-- apparence : dans site_settings.branding
update public.site_settings set company = company where id = 1;  -- no-op pour s'assurer que la ligne existe
alter table public.site_settings add column if not exists branding jsonb not null default '{}'::jsonb;

-- ---------------------------------------------------------------------
-- 7. Realtime
-- ---------------------------------------------------------------------
do $$ begin execute 'alter publication supabase_realtime add table public.reviews'; exception when duplicate_object then null; end $$;
do $$ begin execute 'alter publication supabase_realtime add table public.loyalty_accounts'; exception when duplicate_object then null; end $$;
do $$ begin execute 'alter publication supabase_realtime add table public.loyalty_ledger'; exception when duplicate_object then null; end $$;
do $$ begin execute 'alter publication supabase_realtime add table public.stay_info'; exception when duplicate_object then null; end $$;
do $$ begin execute 'alter publication supabase_realtime add table public.site_blocks'; exception when duplicate_object then null; end $$;
do $$ begin execute 'alter publication supabase_realtime add table public.site_pages'; exception when duplicate_object then null; end $$;
