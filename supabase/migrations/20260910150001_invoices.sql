-- =====================================================================
--  Factures : numérotation séquentielle stable, générées à la demande
-- =====================================================================

create sequence if not exists public.invoice_ref_seq;

create table if not exists public.invoices (
  id             uuid primary key default gen_random_uuid(),
  number         text unique not null,
  reservation_id uuid not null unique references public.reservations(id) on delete cascade,
  issued_at      timestamptz not null default now()
);

alter table public.invoices enable row level security;

drop policy if exists invoices_read on public.invoices;
create policy invoices_read on public.invoices
  for select to authenticated
  using (
    public.auth_has_permission('reports.view')
    or exists (
      select 1 from public.reservations r
      where r.id = invoices.reservation_id and r.guest_id = auth.uid()
    )
  );

-- renvoie (en la créant au besoin) la facture d'une réservation.
-- Accessible au client propriétaire de la réservation et à l'équipe.
create or replace function public.get_or_create_invoice(p_reservation uuid)
returns table (number text, issued_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_res public.reservations;
  v_inv public.invoices;
begin
  select * into v_res from public.reservations where id = p_reservation;
  if not found then raise exception 'reservation_not_found'; end if;

  if v_res.guest_id <> v_uid and not public.auth_has_permission('reports.view') then
    raise exception 'forbidden';
  end if;

  select * into v_inv from public.invoices where reservation_id = p_reservation;
  if not found then
    insert into public.invoices (number, reservation_id)
    values (
      'FA-' || to_char(now(), 'YYYY') || '-' ||
        lpad(nextval('public.invoice_ref_seq')::text, 5, '0'),
      p_reservation
    )
    on conflict (reservation_id) do update set number = public.invoices.number
    returning * into v_inv;
  end if;

  return query select v_inv.number, v_inv.issued_at;
end $$;

grant execute on function public.get_or_create_invoice(uuid) to authenticated;
