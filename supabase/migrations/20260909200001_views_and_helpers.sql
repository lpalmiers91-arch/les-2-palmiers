-- Les 2 Palmiers — vues d'agrégation (dashboard admin) & helpers (Phase 10)
-- Réf. docs/MODELE-DONNEES.md §10. Vues en security_invoker : la RLS des tables
-- sous-jacentes s'applique (l'admin voit tout ; un client ne verrait que ses lignes).

-- =====================================================================
--  Helper : compteur d'usage de l'assistant IA
-- =====================================================================

create or replace function public.increment_ai_usage(
  p_user uuid, p_tokens_in bigint default 0, p_tokens_out bigint default 0
) returns void
language sql security definer set search_path = public as $$
  insert into public.ai_usage (user_id, day, messages, tokens_in, tokens_out)
  values (p_user, current_date, 1, p_tokens_in, p_tokens_out)
  on conflict (user_id, day) do update set
    messages   = ai_usage.messages + 1,
    tokens_in  = ai_usage.tokens_in + excluded.tokens_in,
    tokens_out = ai_usage.tokens_out + excluded.tokens_out;
$$;

grant execute on function public.increment_ai_usage(uuid, bigint, bigint) to authenticated, service_role;

-- =====================================================================
--  Vues d'agrégation
-- =====================================================================

create view public.v_revenue_daily with (security_invoker = true) as
select
  date_trunc('day', paid_at)::date as day,
  purpose,
  sum(amount) filter (where status in ('paid','partially_refunded'))  as gross_revenue,
  count(*)    filter (where status in ('paid','partially_refunded'))  as paid_count
from public.payments
where paid_at is not null
group by 1, 2;

create view public.v_occupancy_monthly with (security_invoker = true) as
with months as (
  select generate_series(
    date_trunc('month', now()) - interval '11 months',
    date_trunc('month', now()),
    interval '1 month'
  )::date as m
)
select
  to_char(m.m, 'YYYY-MM') as month,
  r.apartment_id,
  coalesce(sum(
    greatest(0,
      least(upper(r.date_range), (m.m + interval '1 month')::date)
      - greatest(lower(r.date_range), m.m)
    )
  ), 0) as nights_sold
from months m
left join public.reservations r
  on r.status in ('confirmed','in_stay','completed')
 and r.date_range && daterange(m.m, (m.m + interval '1 month')::date)
group by 1, 2;

create view public.v_service_performance with (security_invoker = true) as
select
  s.slug,
  s.title,
  count(o.id)                                        as orders,
  count(o.id) filter (where o.status = 'completed')  as completed,
  count(o.id) filter (where o.status = 'declined')   as declined,
  coalesce(sum(o.price) filter (where o.status = 'completed'), 0) as revenue
from public.services s
left join public.service_orders o on o.service_id = s.id
group by s.slug, s.title;

create view public.v_staff_activity with (security_invoker = true) as
select
  actor_id,
  actor_role,
  date_trunc('day', at)::date as day,
  count(*) as actions
from public.audit_log
where actor_id is not null
group by 1, 2, 3;

create view public.v_pending_queue with (security_invoker = true) as
select 'reservation'::text as kind, id, reference, status, created_at
from public.reservations where status = 'pending_payment'
union all
select 'service_order'::text as kind, id, reference, status, created_at
from public.service_orders where status in ('requested','accepted');

grant select on
  public.v_revenue_daily, public.v_occupancy_monthly, public.v_service_performance,
  public.v_staff_activity, public.v_pending_queue
  to authenticated;
