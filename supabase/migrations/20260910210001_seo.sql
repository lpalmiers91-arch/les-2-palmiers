-- =====================================================================
--  SEO : réglages globaux + méta par page, éditables par l'équipe
-- =====================================================================

alter table public.site_settings
  add column if not exists seo jsonb not null default '{}'::jsonb;
-- seo = { keywords: text[], default_description: text, priceRange: text,
--         geo: {lat, lng}, twitter: "@handle", google_verification: text }

create table if not exists public.seo_meta (
  path        text primary key,
  title       text,
  description text,
  og_image    text,
  no_index    boolean not null default false,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.profiles(id) on delete set null
);

alter table public.seo_meta enable row level security;

drop policy if exists seo_meta_read on public.seo_meta;
create policy seo_meta_read on public.seo_meta for select to anon, authenticated using (true);

drop policy if exists seo_meta_write on public.seo_meta;
create policy seo_meta_write on public.seo_meta
  for all to authenticated
  using (public.auth_has_permission('cms.edit') or public.auth_has_permission('settings.edit'))
  with check (public.auth_has_permission('cms.edit') or public.auth_has_permission('settings.edit'));

create or replace function public.set_seo_meta(
  p_path text, p_title text, p_description text, p_og_image text default null, p_no_index boolean default false
) returns void language plpgsql security definer set search_path = public as $$
begin
  if not (public.auth_has_permission('cms.edit') or public.auth_has_permission('settings.edit')) then
    raise exception 'forbidden';
  end if;
  insert into public.seo_meta (path, title, description, og_image, no_index, updated_by, updated_at)
  values (p_path, nullif(btrim(p_title), ''), nullif(btrim(p_description), ''),
          nullif(btrim(p_og_image), ''), coalesce(p_no_index, false), auth.uid(), now())
  on conflict (path) do update set
    title = excluded.title, description = excluded.description,
    og_image = excluded.og_image, no_index = excluded.no_index,
    updated_by = auth.uid(), updated_at = now();
end $$;
grant execute on function public.set_seo_meta(text, text, text, text, boolean) to authenticated;

create or replace function public.set_seo_settings(p_seo jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (public.auth_has_permission('cms.edit') or public.auth_has_permission('settings.edit')) then
    raise exception 'forbidden';
  end if;
  update public.site_settings set seo = coalesce(p_seo, '{}'::jsonb) where id = 1;
end $$;
grant execute on function public.set_seo_settings(jsonb) to authenticated;
