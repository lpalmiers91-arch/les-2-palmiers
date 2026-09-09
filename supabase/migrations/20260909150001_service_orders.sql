-- Les 2 Palmiers — commandes de services & prestataires (Phase 7)
-- Réf. docs/MODELE-DONNEES.md §4, docs/FONCTIONNALITES.md §K-§M

-- =====================================================================
--  Prestataires (gérés par le staff en v1)
-- =====================================================================

create table public.providers (
  id         uuid primary key default gen_random_uuid(),
  full_name  text not null,
  phone      text,
  skills     text[] not null default '{}',
  active     boolean not null default true,
  notes      text,
  user_id    uuid references public.profiles(id) on delete set null,  -- compte dédié en v2
  created_at timestamptz not null default now()
);

-- =====================================================================
--  Commandes de services
-- =====================================================================

create sequence public.service_order_ref_seq;

create table public.service_orders (
  id                   uuid primary key default gen_random_uuid(),
  reference            text unique not null,
  service_id           uuid not null references public.services(id) on delete restrict,
  customer_id          uuid not null references public.profiles(id) on delete restrict,
  reservation_id       uuid references public.reservations(id) on delete set null,
  requested_at         timestamptz not null default now(),
  scheduled_for        timestamptz,
  address              text,
  options              jsonb not null default '{}'::jsonb,
  note                 text,
  status               text not null default 'requested'
                         check (status in ('requested','accepted','scheduled','in_progress','completed','declined','cancelled')),
  decline_reason       text,
  price                numeric(12,0) check (price is null or price >= 0),   -- XOF
  payment_timing       text not null default 'on_delivery'
                         check (payment_timing in ('prepaid','on_delivery')),
  amount_paid          numeric(12,0) not null default 0 check (amount_paid >= 0),
  assigned_provider_id uuid references public.providers(id) on delete set null,
  assigned_staff_id    uuid references public.profiles(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index service_orders_customer_idx on public.service_orders(customer_id);
create index service_orders_status_idx   on public.service_orders(status);

create table public.service_order_events (
  id               bigint generated always as identity primary key,
  service_order_id uuid not null references public.service_orders(id) on delete cascade,
  type             text not null,
  payload          jsonb not null default '{}'::jsonb,
  actor_id         uuid references public.profiles(id),
  at               timestamptz not null default now()
);
create index service_order_events_order_idx on public.service_order_events(service_order_id);

create trigger trg_service_orders_updated_at
  before update on public.service_orders
  for each row execute function public.set_updated_at();

create or replace function public.log_service_order_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.service_order_events (service_order_id, type, payload, actor_id)
    values (new.id, 'status_changed',
            jsonb_build_object('from', old.status, 'to', new.status,
                               'decline_reason', new.decline_reason), auth.uid());
  end if;
  return new;
end;
$$;

create trigger trg_service_orders_log
  after update on public.service_orders
  for each row execute function public.log_service_order_change();

-- =====================================================================
--  RPC : création d'une commande de service (par le client)
-- =====================================================================

create or replace function public.create_service_order(
  p_service       uuid,
  p_options       jsonb       default '{}'::jsonb,
  p_scheduled_for timestamptz default null,
  p_address       text        default null,
  p_note          text        default null,
  p_reservation   uuid        default null
) returns public.service_orders
language plpgsql security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_svc    public.services;
  v_ref    text;
  v_order  public.service_orders;
  v_price  numeric;
  v_timing text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  select * into v_svc from public.services where id = p_service and active;
  if not found then raise exception 'service_unavailable'; end if;

  if p_scheduled_for is not null
     and p_scheduled_for < now() + make_interval(hours => v_svc.lead_time_hours) then
    raise exception 'lead_time_not_met';
  end if;

  if p_reservation is not null then
    perform 1 from public.reservations r where r.id = p_reservation and r.guest_id = v_uid;
    if not found then raise exception 'reservation_not_yours'; end if;
  end if;

  if v_svc.pricing_mode = 'fixed' then
    v_price := v_svc.base_price; v_timing := 'prepaid';
  else
    v_price := null; v_timing := 'on_delivery';
  end if;

  v_ref := 'L2P-S-' || to_char(now(),'YYYY') || '-' ||
           lpad(nextval('public.service_order_ref_seq')::text, 5, '0');

  insert into public.service_orders (
    reference, service_id, customer_id, reservation_id, scheduled_for,
    address, options, note, status, price, payment_timing
  ) values (
    v_ref, p_service, v_uid, p_reservation, p_scheduled_for,
    p_address, coalesce(p_options, '{}'::jsonb), p_note, 'requested', v_price, v_timing
  ) returning * into v_order;

  insert into public.service_order_events (service_order_id, type, payload, actor_id)
  values (v_order.id, 'created', jsonb_build_object('options', p_options), v_uid);

  return v_order;
end;
$$;

-- =====================================================================
--  RLS
-- =====================================================================

alter table public.providers            enable row level security;
alter table public.service_orders       enable row level security;
alter table public.service_order_events enable row level security;

-- providers : visibles/éditables par le staff qui gère les services
create policy providers_read on public.providers for select to authenticated
  using (public.is_staff(auth.uid()));
create policy providers_write on public.providers for all to authenticated
  using (public.has_permission(auth.uid(),'providers.manage'))
  with check (public.has_permission(auth.uid(),'providers.manage'));

-- commandes : le client voit les siennes ; le staff (services.orders.view) voit tout ;
-- modification par services.orders.manage. Création via RPC.
create policy service_orders_select on public.service_orders for select to authenticated
  using (customer_id = auth.uid() or public.has_permission(auth.uid(),'services.orders.view'));
create policy service_orders_staff_update on public.service_orders for update to authenticated
  using (public.has_permission(auth.uid(),'services.orders.manage'))
  with check (public.has_permission(auth.uid(),'services.orders.manage'));

create policy service_order_events_select on public.service_order_events for select to authenticated
  using (exists (
    select 1 from public.service_orders o
    where o.id = service_order_id
      and (o.customer_id = auth.uid() or public.has_permission(auth.uid(),'services.orders.view'))
  ));

-- =====================================================================
--  GRANTS
-- =====================================================================

grant select on public.providers, public.service_orders, public.service_order_events to authenticated;
grant insert, update, delete on public.providers to authenticated;
grant update on public.service_orders to authenticated;

grant execute on function public.create_service_order(uuid, jsonb, timestamptz, text, text, uuid) to authenticated;
