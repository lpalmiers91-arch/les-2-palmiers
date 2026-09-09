-- Le staff édite le contenu du contrat (clauses, champs). Le client voit la
-- version à jour automatiquement.

create or replace function public.staff_update_contract(p_contract uuid, p_terms jsonb)
returns public.contracts
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_row public.contracts;
begin
  if not public.has_permission(v_uid, 'reservations.update') then raise exception 'forbidden'; end if;
  update public.contracts
    set terms = coalesce(p_terms, '{}'::jsonb), updated_at = now()
  where id = p_contract
  returning * into v_row;
  if not found then raise exception 'not_found'; end if;

  insert into public.notifications (user_id, type, title, body, data)
  values (v_row.client_id, 'contract', 'Contrat mis à jour',
          'Votre contrat de séjour a été actualisé par l''équipe.',
          jsonb_build_object('contract_id', v_row.id));
  return v_row;
end $$;
grant execute on function public.staff_update_contract(uuid, jsonb) to authenticated;

-- liste des contrats pour le staff (avec nom client + réf réservation)
create or replace function public.list_contracts()
returns table (
  id uuid, reference text, status text, terms jsonb,
  client_name text, reservation_ref text, created_at timestamptz,
  client_signed_at timestamptz, countersigned_at timestamptz
)
language sql security definer set search_path = public as $$
  select c.id, c.reference, c.status, c.terms,
         p.full_name, r.reference, c.created_at, c.client_signed_at, c.countersigned_at
  from public.contracts c
  left join public.profiles p on p.id = c.client_id
  left join public.reservations r on r.id = c.reservation_id
  where public.has_permission(auth.uid(), 'reservations.view')
  order by c.created_at desc;
$$;
grant execute on function public.list_contracts() to authenticated;
