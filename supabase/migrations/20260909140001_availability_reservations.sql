-- Les 2 Palmiers — disponibilités, tarification & réservations (Phases 4-5)
-- Réf. docs/MODELE-DONNEES.md §2-§3, docs/FONCTIONNALITES.md §H-§I

-- =====================================================================
--  Tarification par période
-- =====================================================================

create table public.price_rules (
  id               uuid primary key default gen_random_uuid(),
  apartment_id     uuid not null references public.apartments(id) on delete cascade,
  date_range       daterange not null,
  nightly_price    numeric(12,0) not null check (nightly_price >= 0),
  min_nights       int not null default 1 check (min_nights >= 1),
  discount_percent numeric(5,2) not null default 0 check (discount_percent between 0 and 100),
  label            text,
  created_at       timestamptz not null default now(),
  constraint price_rules_no_overlap
    exclude using gist (apartment_id with =, date_range with &&)
);
comment on table public.price_rules is 'Périodes tarifaires. Hors période : apartments.base_price s''applique.';

-- =====================================================================
--  Blocages de disponibilité
-- =====================================================================

create table public.availability_blocks (
  id           uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references public.apartments(id) on delete cascade,
  date_range   daterange not null,
  reason       text not null default 'owner'
                 check (reason in ('maintenance','owner','external_ical','other')),
  note         text,
  created_by   uuid references public.profiles(id),
  created_at   timestamptz not null default now(),
  constraint availability_blocks_no_overlap
    exclude using gist (apartment_id with =, date_range with &&)
);

-- =====================================================================
--  Réservations
-- =====================================================================

create sequence public.reservation_ref_seq;

create table public.reservations (
  id             uuid primary key default gen_random_uuid(),
  reference      text unique not null,
  apartment_id   uuid not null references public.apartments(id) on delete restrict,
  guest_id       uuid not null references public.profiles(id) on delete restrict,
  date_range     daterange not null,
  guests_count   int not null default 1 check (guests_count > 0),
  nights         int generated always as (upper(date_range) - lower(date_range)) stored,
  nightly_price  numeric(12,0) not null check (nightly_price >= 0),   -- moyenne figée
  fees           jsonb not null default '{}'::jsonb,
  discount_amount numeric(12,0) not null default 0 check (discount_amount >= 0),
  total_amount   numeric(12,0) not null check (total_amount >= 0),
  deposit_amount numeric(12,0) not null default 0 check (deposit_amount >= 0),
  amount_paid    numeric(12,0) not null default 0 check (amount_paid >= 0),
  currency       text not null default 'XOF',
  status         text not null default 'pending_payment'
                   check (status in ('pending_payment','confirmed','in_stay','completed','cancelled','no_show')),
  cancellation   jsonb,
  source         text not null default 'web' check (source in ('web','staff','external')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  -- anti double-réservation : aucun chevauchement entre réservations "vivantes"
  constraint reservations_no_overlap
    exclude using gist (apartment_id with =, date_range with &&)
    where (status in ('pending_payment','confirmed','in_stay'))
);
create index reservations_guest_idx on public.reservations(guest_id);
create index reservations_status_idx on public.reservations(status);

create table public.reservation_events (
  id             bigint generated always as identity primary key,
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  type           text not null,
  payload        jsonb not null default '{}'::jsonb,
  actor_id       uuid references public.profiles(id),
  at             timestamptz not null default now()
);
create index reservation_events_res_idx on public.reservation_events(reservation_id);

create trigger trg_reservations_updated_at
  before update on public.reservations
  for each row execute function public.set_updated_at();

create or replace function public.log_reservation_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.reservation_events (reservation_id, type, payload, actor_id)
    values (new.id, 'status_changed',
            jsonb_build_object('from', old.status, 'to', new.status), auth.uid());
  end if;
  return new;
end;
$$;

create trigger trg_reservations_log
  after update on public.reservations
  for each row execute function public.log_reservation_change();

-- =====================================================================
--  Fonctions métier
-- =====================================================================

-- Disponibilité réelle : aucune réservation vivante ni blocage sur la période.
create or replace function public.is_available(p_apartment uuid, p_range daterange)
returns boolean
language sql stable security definer set search_path = public as $$
  select
    not exists (
      select 1 from public.reservations r
      where r.apartment_id = p_apartment
        and r.status in ('pending_payment','confirmed','in_stay')
        and r.date_range && p_range
    )
    and not exists (
      select 1 from public.availability_blocks b
      where b.apartment_id = p_apartment
        and b.date_range && p_range
    );
$$;

-- Devis détaillé d'un séjour (nuit par nuit).
create or replace function public.quote_stay(p_apartment uuid, p_range daterange, p_guests int default 1)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_apt        public.apartments;
  v_nights     int;
  v_night      date;
  v_nightly    numeric;
  v_rule_min   int;
  v_rule_disc  numeric;
  v_subtotal   numeric := 0;
  v_max_disc   numeric := 0;
  v_min_nights int := 1;
  v_lines      jsonb := '[]'::jsonb;
begin
  select * into v_apt from public.apartments where id = p_apartment;
  if not found then raise exception 'apartment_not_found'; end if;

  v_nights := upper(p_range) - lower(p_range);
  if v_nights < 1 then raise exception 'invalid_range'; end if;

  v_night := lower(p_range);
  while v_night < upper(p_range) loop
    select pr.nightly_price, pr.min_nights, pr.discount_percent
      into v_nightly, v_rule_min, v_rule_disc
      from public.price_rules pr
      where pr.apartment_id = p_apartment and pr.date_range @> v_night
      limit 1;

    if v_nightly is null then
      v_nightly := v_apt.base_price; v_rule_min := 1; v_rule_disc := 0;
    end if;

    v_subtotal   := v_subtotal + v_nightly;
    v_max_disc   := greatest(v_max_disc, coalesce(v_rule_disc, 0));
    v_min_nights := greatest(v_min_nights, coalesce(v_rule_min, 1));
    v_lines      := v_lines || jsonb_build_object('date', v_night, 'nightly', v_nightly);
    v_night      := v_night + 1;
  end loop;

  return jsonb_build_object(
    'apartment_id',     p_apartment,
    'nights',           v_nights,
    'guests',           p_guests,
    'currency',         v_apt.currency,
    'nightly_lines',    v_lines,
    'lodging_subtotal', v_subtotal,
    'discount_percent', v_max_disc,
    'discount_amount',  round(v_subtotal * v_max_disc / 100.0),
    'cleaning_fee',     v_apt.cleaning_fee,
    'total',            v_subtotal - round(v_subtotal * v_max_disc / 100.0) + v_apt.cleaning_fee,
    'min_nights',       v_min_nights,
    'meets_min_nights', (v_nights >= v_min_nights),
    'over_capacity',    (p_guests > v_apt.capacity),
    'available',        public.is_available(p_apartment, p_range)
  );
end;
$$;

-- Création d'une réservation (transaction verrouillée par appartement).
create or replace function public.create_reservation(
  p_apartment uuid, p_range daterange, p_guests int default 1, p_deposit_percent int default 100
) returns public.reservations
language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_quote jsonb;
  v_ref   text;
  v_res   public.reservations;
  v_total numeric;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  perform pg_advisory_xact_lock(hashtext(p_apartment::text));

  v_quote := public.quote_stay(p_apartment, p_range, p_guests);

  if not (v_quote->>'available')::boolean then raise exception 'dates_unavailable'; end if;
  if (v_quote->>'over_capacity')::boolean   then raise exception 'over_capacity';   end if;
  if not (v_quote->>'meets_min_nights')::boolean then raise exception 'below_min_nights'; end if;

  v_total := (v_quote->>'total')::numeric;
  v_ref := 'L2P-' || to_char(now(),'YYYY') || '-' ||
           lpad(nextval('public.reservation_ref_seq')::text, 5, '0');

  insert into public.reservations (
    reference, apartment_id, guest_id, date_range, guests_count,
    nightly_price, fees, discount_amount, total_amount, deposit_amount, currency, status, source
  ) values (
    v_ref, p_apartment, v_uid, p_range, p_guests,
    round((v_quote->>'lodging_subtotal')::numeric / (v_quote->>'nights')::numeric),
    jsonb_build_object('cleaning_fee', (v_quote->>'cleaning_fee')::numeric),
    (v_quote->>'discount_amount')::numeric,
    v_total,
    round(v_total * greatest(least(p_deposit_percent,100),1) / 100.0),
    'XOF', 'pending_payment', 'web'
  ) returning * into v_res;

  insert into public.reservation_events (reservation_id, type, payload, actor_id)
  values (v_res.id, 'created', jsonb_build_object('quote', v_quote), v_uid);

  return v_res;
end;
$$;

-- =====================================================================
--  RLS
-- =====================================================================

alter table public.price_rules         enable row level security;
alter table public.availability_blocks enable row level security;
alter table public.reservations        enable row level security;
alter table public.reservation_events  enable row level security;

-- price_rules : lecture publique (prix indicatifs), écriture pricing.edit
create policy price_rules_read  on public.price_rules for select using (true);
create policy price_rules_write on public.price_rules for all to authenticated
  using (public.has_permission(auth.uid(),'pricing.edit'))
  with check (public.has_permission(auth.uid(),'pricing.edit'));

-- availability_blocks : détail réservé au staff, écriture availability.edit
create policy blocks_read  on public.availability_blocks for select to authenticated
  using (public.is_staff(auth.uid()));
create policy blocks_write on public.availability_blocks for all to authenticated
  using (public.has_permission(auth.uid(),'availability.edit'))
  with check (public.has_permission(auth.uid(),'availability.edit'));

-- reservations : le client voit les siennes, le staff (reservations.view) voit tout ;
-- création via create_reservation() uniquement ; modif par reservations.update.
create policy reservations_select on public.reservations for select to authenticated
  using (guest_id = auth.uid() or public.has_permission(auth.uid(),'reservations.view'));
create policy reservations_staff_update on public.reservations for update to authenticated
  using (public.has_permission(auth.uid(),'reservations.update'))
  with check (public.has_permission(auth.uid(),'reservations.update'));

create policy reservation_events_select on public.reservation_events for select to authenticated
  using (exists (
    select 1 from public.reservations r
    where r.id = reservation_id
      and (r.guest_id = auth.uid() or public.has_permission(auth.uid(),'reservations.view'))
  ));

-- =====================================================================
--  GRANTS
-- =====================================================================

grant select on public.price_rules to anon, authenticated;
grant select on public.availability_blocks, public.reservations, public.reservation_events to authenticated;
grant insert, update, delete on public.price_rules, public.availability_blocks to authenticated;
grant update on public.reservations to authenticated;

grant execute on function public.is_available(uuid, daterange)          to anon, authenticated;
grant execute on function public.quote_stay(uuid, daterange, int)       to anon, authenticated;
grant execute on function public.create_reservation(uuid, daterange, int, int) to authenticated;
