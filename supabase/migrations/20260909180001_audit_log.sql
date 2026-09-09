-- Les 2 Palmiers — journal d'audit append-only (Phase 12)
-- Réf. docs/MODELE-DONNEES.md §9, docs/FONCTIONNALITES.md §S

create table public.audit_log (
  id         bigint generated always as identity primary key,
  actor_id   uuid,
  actor_role text,
  action     text not null,                 -- insert / update / delete
  entity     text not null,                 -- nom de table
  entity_id  text,
  before     jsonb,
  after      jsonb,
  at         timestamptz not null default now()
);
create index audit_log_entity_idx on public.audit_log(entity, at desc);
create index audit_log_actor_idx  on public.audit_log(actor_id, at desc);

-- =====================================================================
--  Trigger générique d'audit
-- =====================================================================

create or replace function public.audit_trigger()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_actor  uuid := auth.uid();
  v_role   text;
  v_before jsonb;
  v_after  jsonb;
begin
  select string_agg(role_id, ',' order by role_id) into v_role
  from public.user_roles where user_id = v_actor;

  if tg_op = 'DELETE' then
    v_before := to_jsonb(old); v_after := null;
  elsif tg_op = 'UPDATE' then
    v_before := to_jsonb(old); v_after := to_jsonb(new);
  else
    v_before := null; v_after := to_jsonb(new);
  end if;

  insert into public.audit_log (actor_id, actor_role, action, entity, entity_id, before, after)
  values (v_actor, v_role, lower(tg_op), tg_table_name,
          coalesce(v_after->>'id', v_before->>'id'), v_before, v_after);

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

-- =====================================================================
--  Attache l'audit aux tables sensibles
-- =====================================================================

do $$
declare t text;
begin
  foreach t in array array[
    'reservations','service_orders','payments','refunds','apartments',
    'availability_blocks','price_rules','services','service_categories',
    'user_roles','role_permissions','providers'
  ] loop
    execute format(
      'create trigger trg_audit_%1$s after insert or update or delete on public.%1$s
       for each row execute function public.audit_trigger()', t);
  end loop;
end $$;

-- =====================================================================
--  Append-only : bloque toute modification / suppression
-- =====================================================================

create or replace function public.audit_log_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'audit_log est append-only';
end;
$$;

create trigger trg_audit_log_immutable
  before update or delete on public.audit_log
  for each row execute function public.audit_log_immutable();

-- =====================================================================
--  RLS & grants
-- =====================================================================

alter table public.audit_log enable row level security;

create policy audit_log_read on public.audit_log for select to authenticated
  using (public.has_permission(auth.uid(),'audit.view'));

grant select on public.audit_log to authenticated;
revoke update, delete on public.audit_log from authenticated, anon;
