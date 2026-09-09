-- =====================================================================
--  Suivi maison : évènements (pages vues, clics CTA, étapes du tunnel).
--  Écriture anonyme autorisée (après consentement, côté client) ;
--  lecture réservée à reports.view.
-- =====================================================================

create table if not exists public.analytics_events (
  id          bigint generated always as identity primary key,
  session_id  text not null,
  user_id     uuid references public.profiles(id) on delete set null,
  event       text not null,              -- page_view | cta_click | funnel_step | signup | booking
  path        text,
  referrer    text,
  utm_source  text,
  utm_medium  text,
  utm_campaign text,
  meta        jsonb not null default '{}'::jsonb,
  ua          text,
  created_at  timestamptz not null default now()
);
create index if not exists analytics_events_created_idx on public.analytics_events(created_at desc);
create index if not exists analytics_events_event_idx   on public.analytics_events(event, created_at desc);
create index if not exists analytics_events_session_idx on public.analytics_events(session_id);

alter table public.analytics_events enable row level security;

-- insertion : tout le monde (anonyme compris) ; jamais de lecture publique
create policy analytics_insert on public.analytics_events for insert
  to anon, authenticated with check (true);
create policy analytics_read on public.analytics_events for select to authenticated
  using (public.has_permission(auth.uid(), 'reports.view'));

grant insert on public.analytics_events to anon, authenticated;
grant select on public.analytics_events to authenticated;

-- RPC d'écriture (borne les champs, associe l'utilisateur si connecté)
create or replace function public.track_event(
  p_session text, p_event text, p_path text default null, p_referrer text default null,
  p_utm jsonb default '{}'::jsonb, p_meta jsonb default '{}'::jsonb, p_ua text default null
) returns void language plpgsql security definer set search_path = public as $$
begin
  if coalesce(trim(p_session), '') = '' or coalesce(trim(p_event), '') = '' then return; end if;
  insert into public.analytics_events
    (session_id, user_id, event, path, referrer, utm_source, utm_medium, utm_campaign, meta, ua)
  values (
    left(p_session, 64), auth.uid(), left(p_event, 40),
    left(p_path, 300), left(p_referrer, 300),
    left(p_utm->>'source', 80), left(p_utm->>'medium', 80), left(p_utm->>'campaign', 120),
    coalesce(p_meta, '{}'::jsonb), left(p_ua, 300)
  );
end $$;

grant execute on function public.track_event(text, text, text, text, jsonb, jsonb, text) to anon, authenticated;

-- Vue agrégée pour le tableau de bord (30 derniers jours)
create or replace view public.v_analytics_daily with (security_invoker = true) as
  select
    date_trunc('day', created_at)::date as day,
    count(*) filter (where event = 'page_view')  as views,
    count(distinct session_id)                   as sessions,
    count(*) filter (where event = 'cta_click')  as cta_clicks,
    count(*) filter (where event = 'booking')    as bookings
  from public.analytics_events
  where created_at > now() - interval '30 days'
  group by 1 order by 1;

grant select on public.v_analytics_daily to authenticated;
