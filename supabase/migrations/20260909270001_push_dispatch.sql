-- =====================================================================
--  Notifications push web temps réel
--  - pg_net pour appeler l'Edge Function `notify` depuis un trigger DB
--  - chaque INSERT dans public.notifications est distribué (e-mail + push)
-- =====================================================================

create extension if not exists pg_net;

-- endpoint unique (un abonnement = un appareil/navigateur)
alter table public.push_subscriptions
  drop constraint if exists push_subscriptions_user_id_endpoint_key;

-- purge d'éventuels doublons avant la contrainte
delete from public.push_subscriptions a
using public.push_subscriptions b
where a.endpoint = b.endpoint and a.ctid < b.ctid;

alter table public.push_subscriptions
  add constraint push_subscriptions_endpoint_key unique (endpoint);

-- coordonnées de l'Edge Function (clé anon publique : la function utilise
-- la service_role en interne, l'appelant sert seulement à passer verify_jwt).
create or replace function public.notify_endpoint()
returns text language sql immutable as $$
  select 'https://zmobadwgoqcwkryefciq.supabase.co/functions/v1/notify'
$$;

create or replace function public.notify_anon_key()
returns text language sql immutable as $$
  select 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inptb2JhZHdnb3Fjd2tyeWVmY2lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MDE5NTIsImV4cCI6MjEwNDQ3Nzk1Mn0.y2xsRIML2cIMFzJcx6eHmKv-zjpu9is0rGzAZ6xssm4'
$$;

-- distribution d'une notification via l'Edge Function
create or replace function public.dispatch_notification()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  perform net.http_post(
    url     := public.notify_endpoint(),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.notify_anon_key()
    ),
    body    := jsonb_build_object('notification_id', new.id),
    timeout_milliseconds := 8000
  );
  return new;
exception when others then
  -- ne jamais bloquer l'écriture d'une notification si le réseau échoue
  return new;
end;
$$;

drop trigger if exists trg_notifications_dispatch on public.notifications;
create trigger trg_notifications_dispatch
  after insert on public.notifications
  for each row execute function public.dispatch_notification();

-- les nouvelles notifications doivent viser aussi le canal push par défaut
-- (l'e-mail reste opt-in par notification pour éviter la sur-sollicitation)
alter table public.notifications
  alter column channels set default '{in_app,push}';
