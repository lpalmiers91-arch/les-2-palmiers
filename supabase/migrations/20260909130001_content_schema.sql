-- Les 2 Palmiers — contenu : appartements, services, destinations (Phase 3)
-- Réf. docs/MODELE-DONNEES.md §2

-- =====================================================================
--  Appartements
-- =====================================================================

create table public.apartments (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text unique not null,
  name                 text not null,
  summary              text,
  description          text,
  address              text,                       -- privé (affichage approximatif public)
  geo                  point,
  capacity             int  not null default 2 check (capacity > 0),
  bedrooms             int  not null default 1 check (bedrooms >= 0),
  bathrooms            int  not null default 1 check (bathrooms >= 0),
  base_price           numeric(12,0) not null default 0 check (base_price >= 0),      -- XOF entier / nuit
  cleaning_fee         numeric(12,0) not null default 0 check (cleaning_fee >= 0),
  currency             text not null default 'XOF',
  cancellation_policy  text not null default 'moderate'
                         check (cancellation_policy in ('flexible','moderate','strict')),
  house_rules          jsonb not null default '[]'::jsonb,
  checkin_from         time,
  checkout_before      time,
  status               text not null default 'draft'
                         check (status in ('draft','published','hidden')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
comment on table public.apartments is 'Logements. v1 = 1 seul, le schéma en supporte plusieurs.';

create table public.apartment_amenities (
  id           uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references public.apartments(id) on delete cascade,
  amenity_key  text not null,                       -- wifi, parking, kitchen, ac, lounge, ...
  detail       text,
  position     int  not null default 0,
  unique (apartment_id, amenity_key)
);

create table public.apartment_media (
  id           uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references public.apartments(id) on delete cascade,
  type         text not null check (type in ('photo','video')),
  storage_path text not null,                       -- bucket apartment-media
  alt          text,
  position     int  not null default 0,
  is_cover     boolean not null default false,
  created_at   timestamptz not null default now()
);
create unique index apartment_media_single_cover
  on public.apartment_media(apartment_id) where is_cover;

-- =====================================================================
--  Catalogue de services
-- =====================================================================

create table public.service_categories (
  id       uuid primary key default gen_random_uuid(),
  slug     text unique not null,
  label    text not null,
  position int  not null default 0
);

create table public.services (
  id             uuid primary key default gen_random_uuid(),
  slug           text unique not null,
  category_id    uuid references public.service_categories(id) on delete set null,
  title          text not null,
  description    text,
  pricing_mode   text not null default 'quote'
                   check (pricing_mode in ('fixed','quote','metered')),
  base_price     numeric(12,0) check (base_price is null or base_price >= 0),  -- si 'fixed'
  unit           text not null default 'prestation',                          -- prestation / heure / jour
  options_schema jsonb not null default '[]'::jsonb,                          -- champs demandés au client
  lead_time_hours int  not null default 24 check (lead_time_hours >= 0),
  icon           text,                                                        -- aligné avec la vitrine
  active         boolean not null default true,
  position       int  not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
comment on column public.services.base_price is 'XOF entier. Requis quand pricing_mode = fixed.';

-- =====================================================================
--  Destinations touristiques (rubrique éditoriale)
-- =====================================================================

create table public.destinations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  tag         text,
  description text,
  media       jsonb not null default '[]'::jsonb,
  position    int  not null default 0
);

-- =====================================================================
--  updated_at
-- =====================================================================

create trigger trg_apartments_updated_at
  before update on public.apartments
  for each row execute function public.set_updated_at();

create trigger trg_services_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

-- =====================================================================
--  RLS
-- =====================================================================

alter table public.apartments         enable row level security;
alter table public.apartment_amenities enable row level security;
alter table public.apartment_media    enable row level security;
alter table public.service_categories enable row level security;
alter table public.services           enable row level security;
alter table public.destinations       enable row level security;

-- helper : l'appartement parent est-il visible pour ce visiteur ?
create or replace function public.apartment_is_visible(aid uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.apartments a
    where a.id = aid
      and (a.status = 'published' or public.is_staff(auth.uid()))
  );
$$;

-- Appartements : contenu publié visible de tous ; le staff voit tout ;
-- écriture réservée à la permission apartments.edit.
create policy apartments_read_published on public.apartments for select
  using (status = 'published' or public.is_staff(auth.uid()));
create policy apartments_write on public.apartments for all to authenticated
  using (public.has_permission(auth.uid(),'apartments.edit'))
  with check (public.has_permission(auth.uid(),'apartments.edit'));

create policy amenities_read on public.apartment_amenities for select
  using (public.apartment_is_visible(apartment_id));
create policy amenities_write on public.apartment_amenities for all to authenticated
  using (public.has_permission(auth.uid(),'apartments.edit'))
  with check (public.has_permission(auth.uid(),'apartments.edit'));

create policy media_read on public.apartment_media for select
  using (public.apartment_is_visible(apartment_id));
create policy media_write on public.apartment_media for all to authenticated
  using (public.has_permission(auth.uid(),'media.edit'))
  with check (public.has_permission(auth.uid(),'media.edit'));

-- Catalogue : services actifs visibles de tous ; le staff voit tout ;
-- écriture réservée à catalog.edit (le contrôle fin pricing.edit se fait côté app).
create policy services_read on public.services for select
  using (active or public.is_staff(auth.uid()));
create policy services_write on public.services for all to authenticated
  using (public.has_permission(auth.uid(),'catalog.edit'))
  with check (public.has_permission(auth.uid(),'catalog.edit'));

create policy service_categories_read on public.service_categories for select using (true);
create policy service_categories_write on public.service_categories for all to authenticated
  using (public.has_permission(auth.uid(),'catalog.edit'))
  with check (public.has_permission(auth.uid(),'catalog.edit'));

-- Destinations : publiques ; écriture settings.edit.
create policy destinations_read on public.destinations for select using (true);
create policy destinations_write on public.destinations for all to authenticated
  using (public.has_permission(auth.uid(),'settings.edit'))
  with check (public.has_permission(auth.uid(),'settings.edit'));

-- =====================================================================
--  GRANTS
-- =====================================================================

grant select on
  public.apartments, public.apartment_amenities, public.apartment_media,
  public.service_categories, public.services, public.destinations
  to anon, authenticated;

grant insert, update, delete on
  public.apartments, public.apartment_amenities, public.apartment_media,
  public.service_categories, public.services, public.destinations
  to authenticated;
