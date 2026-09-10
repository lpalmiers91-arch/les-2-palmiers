-- =====================================================================
--  Calendrier de disponibilité public (nuits indisponibles)
-- =====================================================================

create or replace function public.apartment_calendar(
  p_apartment uuid,
  p_from date default current_date,
  p_to date default (current_date + 180)
)
returns setof date
language sql stable security definer set search_path = public as $$
  with span as (
    select generate_series(greatest(p_from, current_date), p_to, interval '1 day')::date as d
  )
  select s.d
  from span s
  where exists (
    select 1 from public.reservations r
    where r.apartment_id = p_apartment
      and r.status in ('pending_payment', 'confirmed', 'in_stay')
      and r.date_range @> s.d
  )
  or exists (
    select 1 from public.availability_blocks b
    where b.apartment_id = p_apartment
      and b.date_range @> s.d
  );
$$;

grant execute on function public.apartment_calendar(uuid, date, date) to anon, authenticated;
