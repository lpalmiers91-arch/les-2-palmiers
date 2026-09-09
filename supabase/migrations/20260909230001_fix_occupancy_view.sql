-- Les 2 Palmiers — correctif v_occupancy_monthly.
-- least()/greatest() ignorent les NULL : sur un LEFT JOIN sans réservation,
-- l'ancienne formule comptait un mois entier par mois. On neutralise via un CASE.

create or replace view public.v_occupancy_monthly with (security_invoker = true) as
with months as (
  select generate_series(
    date_trunc('month', now()) - interval '11 months',
    date_trunc('month', now()),
    interval '1 month'
  )::date as m
)
select
  to_char(m.m, 'YYYY-MM') as month,
  a.id as apartment_id,
  coalesce(sum(
    case
      when r.id is null then 0
      else greatest(0,
        least(upper(r.date_range), (m.m + interval '1 month')::date)
        - greatest(lower(r.date_range), m.m))
    end
  ), 0) as nights_sold
from months m
cross join public.apartments a
left join public.reservations r
  on r.apartment_id = a.id
 and r.status in ('confirmed','in_stay','completed')
 and r.date_range && daterange(m.m, (m.m + interval '1 month')::date)
group by 1, 2;

grant select on public.v_occupancy_monthly to authenticated;
