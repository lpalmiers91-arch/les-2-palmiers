-- =====================================================================
--  Synchronisation de calendrier (iCal) : export + import (Airbnb, Booking…)
-- =====================================================================

-- jeton d'export par appartement (URL publique en lecture seule du .ics)
alter table public.apartments
  add column if not exists ical_token text unique default replace(gen_random_uuid()::text, '-', '');

update public.apartments set ical_token = replace(gen_random_uuid()::text, '-', '')
  where ical_token is null;

-- flux externes importés
create table if not exists public.apartment_ical_feeds (
  id             uuid primary key default gen_random_uuid(),
  apartment_id   uuid not null references public.apartments(id) on delete cascade,
  url            text not null,
  label          text,
  active         boolean not null default true,
  last_synced_at timestamptz,
  last_status    text,
  last_count     int,
  created_at     timestamptz not null default now(),
  unique (apartment_id, url)
);

alter table public.apartment_ical_feeds enable row level security;

drop policy if exists ical_feeds_staff on public.apartment_ical_feeds;
create policy ical_feeds_staff on public.apartment_ical_feeds
  for all to authenticated
  using (public.auth_has_permission('apartments.edit'))
  with check (public.auth_has_permission('apartments.edit'));

-- résout un appartement depuis son jeton d'export (pour la route API)
create or replace function public.apartment_by_ical_token(p_token text)
returns table (id uuid, name text)
language sql stable security definer set search_path = public as $$
  select id, name from public.apartments where ical_token = p_token limit 1;
$$;
grant execute on function public.apartment_by_ical_token(text) to anon, authenticated;

-- évènements à exporter (réservations actives + blocages manuels ; PAS les
-- blocages venant d'un autre iCal, pour éviter les boucles de synchro)
create or replace function public.apartment_ical_events(p_apartment uuid)
returns table (uid text, starts date, ends date, summary text)
language sql stable security definer set search_path = public as $$
  select 'res-' || r.id::text, lower(r.date_range), upper(r.date_range), 'Réservé — Les 2 Palmiers'
  from public.reservations r
  where r.apartment_id = p_apartment
    and r.status in ('pending_payment', 'confirmed', 'in_stay', 'completed')
  union all
  select 'blk-' || b.id::text, lower(b.date_range), upper(b.date_range),
         coalesce(b.note, 'Indisponible')
  from public.availability_blocks b
  where b.apartment_id = p_apartment
    and b.reason <> 'external_ical';
$$;
grant execute on function public.apartment_ical_events(uuid) to anon, authenticated;

-- applique les évènements importés d'un flux : remplace tous les blocages
-- external_ical liés à ce flux par la nouvelle liste
create or replace function public.apply_ical_feed(p_feed uuid, p_events jsonb)
returns int
language plpgsql security definer set search_path = public as $$
declare
  v_feed public.apartment_ical_feeds;
  v_ev   jsonb;
  v_n    int := 0;
  v_note text;
begin
  select * into v_feed from public.apartment_ical_feeds where id = p_feed;
  if not found then raise exception 'feed_not_found'; end if;

  v_note := 'iCal: ' || coalesce(v_feed.label, 'flux externe');

  -- purge des anciens blocages de CE flux
  delete from public.availability_blocks
  where apartment_id = v_feed.apartment_id
    and reason = 'external_ical'
    and note = v_note;

  for v_ev in select * from jsonb_array_elements(coalesce(p_events, '[]'::jsonb))
  loop
    begin
      insert into public.availability_blocks (apartment_id, date_range, reason, note)
      values (
        v_feed.apartment_id,
        daterange((v_ev->>'start')::date, (v_ev->>'end')::date, '[)'),
        'external_ical',
        v_note
      );
      v_n := v_n + 1;
    exception when others then
      -- chevauchement avec un blocage/résa existant : on ignore cette période
      null;
    end;
  end loop;

  update public.apartment_ical_feeds
    set last_synced_at = now(), last_status = 'ok', last_count = v_n
    where id = p_feed;

  return v_n;
end $$;

grant execute on function public.apply_ical_feed(uuid, jsonb) to authenticated, service_role;

create or replace function public.mark_ical_feed_error(p_feed uuid, p_msg text)
returns void language sql security definer set search_path = public as $$
  update public.apartment_ical_feeds
    set last_synced_at = now(), last_status = left('error: ' || coalesce(p_msg, ''), 200)
    where id = p_feed;
$$;
grant execute on function public.mark_ical_feed_error(uuid, text) to authenticated, service_role;
