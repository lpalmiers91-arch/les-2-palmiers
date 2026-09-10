-- =====================================================================
--  Demandes client : annulation / changement de dates d'une réservation
--  Le client demande, l'équipe approuve ou refuse. Rien n'est irréversible
--  côté client.
-- =====================================================================

create table if not exists public.reservation_change_requests (
  id             uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete cascade,
  requested_by   uuid not null references public.profiles(id) on delete cascade,
  kind           text not null check (kind in ('cancel', 'dates')),
  reason         text,
  new_range      daterange,
  status         text not null default 'pending' check (status in ('pending', 'approved', 'declined', 'withdrawn')),
  decided_by     uuid references public.profiles(id) on delete set null,
  decided_at     timestamptz,
  staff_note     text,
  created_at     timestamptz not null default now()
);
create index if not exists rcr_reservation_idx on public.reservation_change_requests(reservation_id, created_at desc);
create unique index if not exists rcr_one_pending
  on public.reservation_change_requests(reservation_id)
  where status = 'pending';

alter table public.reservation_change_requests enable row level security;

drop policy if exists rcr_client_read on public.reservation_change_requests;
create policy rcr_client_read on public.reservation_change_requests
  for select to authenticated
  using (
    requested_by = auth.uid()
    or public.auth_has_permission('reservations.update')
    or public.is_staff(auth.uid())
  );

-- ---------------------------------------------------------------------
-- Client : déposer une demande
-- ---------------------------------------------------------------------
create or replace function public.request_reservation_change(
  p_reservation uuid,
  p_kind text,
  p_reason text default null,
  p_new_range daterange default null
)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_res public.reservations;
  v_id  uuid;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_kind not in ('cancel', 'dates') then raise exception 'bad_kind'; end if;

  select * into v_res from public.reservations where id = p_reservation;
  if not found then raise exception 'reservation_not_found'; end if;
  if v_res.guest_id <> v_uid then raise exception 'forbidden'; end if;
  if v_res.status not in ('pending_payment', 'confirmed') then
    raise exception 'not_changeable';
  end if;
  if p_kind = 'dates' then
    if p_new_range is null or (upper(p_new_range) - lower(p_new_range)) < 1 then
      raise exception 'bad_range';
    end if;
    if lower(p_new_range) < current_date then raise exception 'range_in_past'; end if;
  end if;

  -- retire une éventuelle demande en attente précédente
  update public.reservation_change_requests
    set status = 'withdrawn'
    where reservation_id = p_reservation and status = 'pending';

  insert into public.reservation_change_requests (reservation_id, requested_by, kind, reason, new_range)
  values (p_reservation, v_uid, p_kind, nullif(btrim(p_reason), ''), p_new_range)
  returning id into v_id;

  insert into public.notifications (user_id, type, title, body, data, channels)
  select distinct ur.user_id, 'reservation',
         case when p_kind = 'cancel' then 'Demande d''annulation' else 'Demande de changement de dates' end,
         'Réservation ' || v_res.reference,
         jsonb_build_object('reservation_id', v_res.id, 'change_request_id', v_id),
         '{in_app,email,push}'::text[]
  from public.user_roles ur
  join public.role_permissions rp on rp.role_id = ur.role_id
  where rp.permission_key in ('reservations.update', 'messages.handle');

  return v_id;
end $$;

grant execute on function public.request_reservation_change(uuid, text, text, daterange) to authenticated;

-- ---------------------------------------------------------------------
-- Client : retirer sa demande
-- ---------------------------------------------------------------------
create or replace function public.withdraw_reservation_change(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.reservation_change_requests
    set status = 'withdrawn'
    where id = p_id and requested_by = auth.uid() and status = 'pending';
end $$;

grant execute on function public.withdraw_reservation_change(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Équipe : trancher la demande
-- ---------------------------------------------------------------------
create or replace function public.resolve_reservation_change(
  p_id uuid,
  p_approve boolean,
  p_note text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_req public.reservation_change_requests;
  v_res public.reservations;
  v_conflict int;
  v_new_total numeric;
  v_quote jsonb;
begin
  if not (public.auth_has_permission('reservations.update') or public.is_staff(v_uid)) then
    raise exception 'forbidden';
  end if;

  select * into v_req from public.reservation_change_requests where id = p_id for update;
  if not found then raise exception 'request_not_found'; end if;
  if v_req.status <> 'pending' then raise exception 'already_decided'; end if;

  select * into v_res from public.reservations where id = v_req.reservation_id for update;

  if p_approve then
    if v_req.kind = 'cancel' then
      update public.reservations
        set status = 'cancelled',
            cancellation = jsonb_build_object('at', now(), 'by', 'guest_request', 'reason', v_req.reason)
        where id = v_res.id;

    elsif v_req.kind = 'dates' then
      -- pas de chevauchement avec une autre réservation active
      select count(*) into v_conflict
      from public.reservations
      where apartment_id = v_res.apartment_id
        and id <> v_res.id
        and status in ('pending_payment', 'confirmed', 'in_stay')
        and date_range && v_req.new_range;
      if v_conflict > 0 then raise exception 'dates_unavailable'; end if;

      v_quote := public.quote_stay(v_res.apartment_id, v_req.new_range, v_res.guests_count);
      v_new_total := (v_quote->>'total')::numeric
                     + coalesce((v_res.fees->>'services_prepaid')::numeric, 0);

      update public.reservations
        set date_range     = v_req.new_range,
            nightly_price  = round((v_quote->>'lodging_subtotal')::numeric
                             / nullif((v_quote->>'nights')::numeric, 0)),
            discount_amount = (v_quote->>'discount_amount')::numeric,
            total_amount   = v_new_total,
            fees           = jsonb_set(coalesce(fees, '{}'::jsonb), '{cleaning_fee}',
                             to_jsonb((v_quote->>'cleaning_fee')::numeric))
        where id = v_res.id;
    end if;

    update public.reservation_change_requests
      set status = 'approved', decided_by = v_uid, decided_at = now(), staff_note = nullif(btrim(p_note), '')
      where id = p_id;

    insert into public.notifications (user_id, type, title, body, data, channels)
    values (v_res.guest_id, 'reservation',
            case when v_req.kind = 'cancel' then 'Annulation confirmée' else 'Nouvelles dates confirmées' end,
            'Réservation ' || v_res.reference,
            jsonb_build_object('reservation_id', v_res.id),
            '{in_app,email,push}'::text[]);
  else
    update public.reservation_change_requests
      set status = 'declined', decided_by = v_uid, decided_at = now(), staff_note = nullif(btrim(p_note), '')
      where id = p_id;

    insert into public.notifications (user_id, type, title, body, data, channels)
    values (v_res.guest_id, 'reservation',
            'Demande non retenue',
            coalesce(nullif(btrim(p_note), ''), 'Votre demande de modification n''a pas pu être acceptée.'),
            jsonb_build_object('reservation_id', v_res.id),
            '{in_app,email,push}'::text[]);
  end if;
end $$;

grant execute on function public.resolve_reservation_change(uuid, boolean, text) to authenticated;
