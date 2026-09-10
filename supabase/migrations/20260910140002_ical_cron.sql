-- =====================================================================
--  Planification : synchronise les calendriers externes toutes les 3 h
-- =====================================================================

create or replace function public.trigger_ical_sync()
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform net.http_post(
    url     := 'https://zmobadwgoqcwkryefciq.supabase.co/functions/v1/ical-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.notify_anon_key()
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
exception when others then
  null;
end $$;

select cron.unschedule('ical-sync') where exists (select 1 from cron.job where jobname = 'ical-sync');
select cron.schedule('ical-sync', '17 */3 * * *', $$select public.trigger_ical_sync()$$);
