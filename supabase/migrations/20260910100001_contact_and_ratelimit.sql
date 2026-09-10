-- =====================================================================
--  Formulaire de contact public + limitation de débit générique
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Limitation de débit (rate limiting) — table + fonction réutilisable
--    Clé libre (ex. 'contact:<ip>', 'booking:<uid>'), fenêtre glissante.
-- ---------------------------------------------------------------------
create table if not exists public.rate_limits (
  bucket      text not null,
  window_start timestamptz not null,
  hits        int not null default 0,
  primary key (bucket, window_start)
);

alter table public.rate_limits enable row level security;
-- aucune policy : accès uniquement via les fonctions SECURITY DEFINER

create or replace function public.rl_hit(p_key text, p_max int, p_window interval default interval '1 hour')
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_start timestamptz := date_trunc('second', now()) - (extract(epoch from now())::bigint % greatest(1, extract(epoch from p_window)::bigint)) * interval '1 second';
  v_hits int;
begin
  insert into public.rate_limits (bucket, window_start, hits)
    values (p_key, v_start, 1)
  on conflict (bucket, window_start)
    do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;

  -- ménage opportuniste
  delete from public.rate_limits where window_start < now() - interval '1 day';

  return v_hits <= p_max;  -- true = autorisé
end $$;

grant execute on function public.rl_hit(text, int, interval) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Messages de contact
-- ---------------------------------------------------------------------
create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text not null,
  phone      text,
  subject    text,
  message    text not null,
  locale     text,
  source     text default 'contact_page',
  status     text not null default 'new' check (status in ('new', 'handled', 'archived')),
  handled_by uuid references public.profiles(id) on delete set null,
  handled_at timestamptz,
  user_id    uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists contact_messages_status_idx on public.contact_messages(status, created_at desc);

alter table public.contact_messages enable row level security;

drop policy if exists contact_staff_read on public.contact_messages;
create policy contact_staff_read on public.contact_messages
  for select to authenticated
  using (public.auth_has_permission('messages.handle'));

drop policy if exists contact_staff_update on public.contact_messages;
create policy contact_staff_update on public.contact_messages
  for update to authenticated
  using (public.auth_has_permission('messages.handle'))
  with check (public.auth_has_permission('messages.handle'));

drop policy if exists contact_staff_delete on public.contact_messages;
create policy contact_staff_delete on public.contact_messages
  for delete to authenticated
  using (public.auth_has_permission('messages.handle'));

-- ---------------------------------------------------------------------
-- 3. Dépôt d'un message (public) — validé + limité en débit
-- ---------------------------------------------------------------------
create or replace function public.submit_contact_message(
  p_name text,
  p_email text,
  p_message text,
  p_phone text default null,
  p_subject text default null,
  p_locale text default null,
  p_rl_key text default 'anon'
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_name text := btrim(coalesce(p_name, ''));
  v_email text := btrim(lower(coalesce(p_email, '')));
  v_message text := btrim(coalesce(p_message, ''));
begin
  if length(v_name) < 2 then raise exception 'name_too_short'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'email_invalid'; end if;
  if length(v_message) < 10 then raise exception 'message_too_short'; end if;
  if length(v_message) > 4000 then raise exception 'message_too_long'; end if;

  if not public.rl_hit('contact:' || p_rl_key, 5, interval '1 hour') then
    raise exception 'rate_limited';
  end if;

  insert into public.contact_messages (name, email, phone, subject, message, locale, user_id)
  values (v_name, v_email, nullif(btrim(p_phone), ''), nullif(btrim(p_subject), ''),
          v_message, p_locale, auth.uid())
  returning id into v_id;

  -- prévenir l'équipe (in-app + e-mail + push)
  insert into public.notifications (user_id, type, title, body, data, channels)
  select distinct ur.user_id, 'contact',
         'Nouveau message de contact',
         v_name || ' — ' || left(v_message, 120),
         jsonb_build_object('contact_id', v_id),
         '{in_app,email,push}'::text[]
  from public.user_roles ur
  join public.role_permissions rp on rp.role_id = ur.role_id
  where rp.permission_key = 'messages.handle';

  return v_id;
end $$;

grant execute on function public.submit_contact_message(text, text, text, text, text, text, text) to anon, authenticated;

-- ---------------------------------------------------------------------
-- 4. Traitement côté équipe
-- ---------------------------------------------------------------------
create or replace function public.set_contact_status(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.auth_has_permission('messages.handle') then raise exception 'forbidden'; end if;
  if p_status not in ('new', 'handled', 'archived') then raise exception 'bad_status'; end if;
  update public.contact_messages
    set status = p_status,
        handled_by = case when p_status = 'new' then null else auth.uid() end,
        handled_at = case when p_status = 'new' then null else now() end
    where id = p_id;
end $$;

grant execute on function public.set_contact_status(uuid, text) to authenticated;

create or replace function public.delete_contact_message(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.auth_has_permission('messages.handle') then raise exception 'forbidden'; end if;
  delete from public.contact_messages where id = p_id;
end $$;

grant execute on function public.delete_contact_message(uuid) to authenticated;
