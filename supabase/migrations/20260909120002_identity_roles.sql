-- Les 2 Palmiers — identité, rôles & permissions (Phase 1)
-- Réf. docs/MODELE-DONNEES.md §1

-- =====================================================================
--  Tables de référence : rôles & permissions
-- =====================================================================

create table public.roles (
  id          text primary key,
  label       text not null,
  description text,
  is_system   boolean not null default false,   -- rôle non supprimable
  created_at  timestamptz not null default now()
);
comment on table public.roles is 'Rôles applicatifs. Un utilisateur peut en cumuler plusieurs.';

create table public.permissions (
  key         text primary key,                 -- ex. "reservations.update"
  label       text not null,
  description text
);
comment on table public.permissions is 'Permissions fines attribuables aux rôles.';

create table public.role_permissions (
  role_id        text not null references public.roles(id) on delete cascade,
  permission_key text not null references public.permissions(key) on delete cascade,
  primary key (role_id, permission_key)
);

-- =====================================================================
--  Profils (1-1 avec auth.users)
-- =====================================================================

create table public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  full_name      text,
  phone          text,                           -- format +229 souhaité, NON vérifié
  phone_verified boolean not null default false,
  locale         text not null default 'fr' check (locale in ('fr','en')),
  avatar_url     text,
  preferences    jsonb not null default '{}'::jsonb,  -- canaux de notif, etc.
  deleted_at     timestamptz,                    -- compte supprimé (anonymisé)
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
comment on table public.profiles is 'Profil applicatif de chaque utilisateur authentifié.';

create table public.user_roles (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role_id    text not null references public.roles(id) on delete cascade,
  granted_by uuid references public.profiles(id),
  granted_at timestamptz not null default now(),
  primary key (user_id, role_id)
);

create table public.staff_members (
  user_id   uuid primary key references public.profiles(id) on delete cascade,
  job_title text,
  active    boolean not null default true,
  hired_at  date,
  notes     text
);

create index user_roles_role_idx on public.user_roles(role_id);

-- =====================================================================
--  Fonctions d'autorisation (SECURITY DEFINER, utilisées par les policies)
-- =====================================================================

create or replace function public.has_role(uid uuid, role_key text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = uid and ur.role_id = role_key
  );
$$;

create or replace function public.has_permission(uid uuid, perm text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.role_permissions rp on rp.role_id = ur.role_id
    where ur.user_id = uid and rp.permission_key = perm
  );
$$;

-- Raccourcis pour le code applicatif (auth.uid() implicite)
create or replace function public.auth_has_role(role_key text)
returns boolean language sql stable security definer set search_path = public
as $$ select public.has_role(auth.uid(), role_key); $$;

create or replace function public.auth_has_permission(perm text)
returns boolean language sql stable security definer set search_path = public
as $$ select public.has_permission(auth.uid(), perm); $$;

-- "membre du staff" = tout rôle interne
create or replace function public.is_staff(uid uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles ur
    where ur.user_id = uid and ur.role_id in ('staff','coordinator','admin')
  );
$$;

-- =====================================================================
--  Triggers : updated_at + création de profil à l'inscription
-- =====================================================================

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name')
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role_id)
  values (new.id, 'client')
  on conflict do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
--  RLS
-- =====================================================================

alter table public.roles            enable row level security;
alter table public.permissions      enable row level security;
alter table public.role_permissions enable row level security;
alter table public.profiles         enable row level security;
alter table public.user_roles       enable row level security;
alter table public.staff_members    enable row level security;

-- Référentiels : lecture pour tout utilisateur connecté (le frontend en a besoin
-- pour afficher/masquer les actions). Écriture : admin uniquement.
create policy roles_read              on public.roles            for select to authenticated using (true);
create policy roles_admin_write       on public.roles            for all    to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy permissions_read        on public.permissions      for select to authenticated using (true);
create policy permissions_admin_write on public.permissions      for all    to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create policy role_perms_read         on public.role_permissions for select to authenticated using (true);
create policy role_perms_admin_write  on public.role_permissions for all    to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Profils : chacun voit/modifie le sien ; le staff lit tout ; l'admin fait tout.
create policy profiles_select_self_or_staff on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff(auth.uid()));

create policy profiles_update_self on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_admin_all on public.profiles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- user_roles : chacun voit ses rôles ; le staff les voit ; l'admin les gère.
create policy user_roles_select on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_staff(auth.uid()));

create policy user_roles_admin_write on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- staff_members : lecture staff, écriture admin.
create policy staff_members_read on public.staff_members for select to authenticated
  using (public.is_staff(auth.uid()));

create policy staff_members_admin_write on public.staff_members for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- =====================================================================
--  GRANTS (rôles de la Data API)
-- =====================================================================

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;
grant execute on all functions in schema public to anon, authenticated, service_role;
