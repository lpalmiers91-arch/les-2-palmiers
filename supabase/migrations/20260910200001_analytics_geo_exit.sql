-- =====================================================================
--  Analytics : pays du visiteur + pages de sortie
-- =====================================================================

alter table public.analytics_events
  add column if not exists country text;
create index if not exists analytics_events_country_idx on public.analytics_events(country)
  where country is not null;

-- track_event accepte désormais le pays (renseigné par /api/track côté serveur)
create or replace function public.track_event(
  p_session text, p_event text, p_path text default null, p_referrer text default null,
  p_utm jsonb default '{}'::jsonb, p_meta jsonb default '{}'::jsonb, p_ua text default null,
  p_country text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(trim(p_session), '') = '' or coalesce(trim(p_event), '') = '' then return; end if;
  if not public.rl_hit('evt:' || left(p_session, 64), 300, interval '1 hour') then
    return;
  end if;

  insert into public.analytics_events
    (session_id, user_id, event, path, referrer, utm_source, utm_medium, utm_campaign, meta, ua, country)
  values (
    left(p_session, 64), auth.uid(), left(p_event, 40),
    left(p_path, 300), left(p_referrer, 300),
    left(p_utm->>'source', 80), left(p_utm->>'medium', 80), left(p_utm->>'campaign', 120),
    coalesce(p_meta, '{}'::jsonb), left(p_ua, 300), nullif(upper(left(p_country, 2)), '')
  );
end $$;
grant execute on function public.track_event(text, text, text, text, jsonb, jsonb, text, text) to anon, authenticated;

-- Pays des visiteurs (30 j)
create or replace function public.analytics_countries(p_days int default 30)
returns table (country text, sessions bigint, views bigint)
language sql stable security definer set search_path = public as $$
  select coalesce(country, 'ZZ') as country,
         count(distinct session_id) as sessions,
         count(*) filter (where event = 'page_view') as views
  from public.analytics_events
  where created_at > now() - (p_days || ' days')::interval
  group by 1
  order by sessions desc;
$$;
grant execute on function public.analytics_countries(int) to authenticated;

-- Pages de sortie : dernière page vue de chaque session (30 j)
create or replace function public.analytics_exit_pages(p_days int default 30)
returns table (path text, exits bigint)
language sql stable security definer set search_path = public as $$
  with last_view as (
    select distinct on (session_id) session_id, path
    from public.analytics_events
    where event in ('page_view', 'page_leave')
      and created_at > now() - (p_days || ' days')::interval
    order by session_id, created_at desc
  )
  select coalesce(path, '/') as path, count(*) as exits
  from last_view
  group by 1
  order by exits desc;
$$;
grant execute on function public.analytics_exit_pages(int) to authenticated;
