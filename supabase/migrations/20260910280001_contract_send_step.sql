-- =====================================================================
--  Contrat : étape « envoyé au client » obligatoire avant signature.
--  Cycle : draft (préparé par l'équipe) → sent (envoyé) → signed (client)
--          → countersigned (équipe).
--  Le client ne peut signer qu'un contrat au statut « sent ».
-- =====================================================================

alter table public.contracts drop constraint if exists contracts_status_check;
alter table public.contracts add constraint contracts_status_check
  check (status in ('draft', 'sent', 'signed', 'countersigned', 'cancelled'));

alter table public.contracts add column if not exists sent_at timestamptz;
alter table public.contracts add column if not exists sent_by uuid references public.profiles(id);

-- ---- RPC : l'équipe envoie le contrat au client ----------------------
create or replace function public.send_contract(p_contract uuid)
returns public.contracts
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_row public.contracts;
begin
  if not public.has_permission(v_uid, 'reservations.update') then raise exception 'forbidden'; end if;
  select * into v_row from public.contracts where id = p_contract for update;
  if not found then raise exception 'not_found'; end if;
  if v_row.status not in ('draft', 'sent') then raise exception 'bad_status'; end if;

  update public.contracts
    set status = 'sent', sent_at = now(), sent_by = v_uid, updated_at = now()
    where id = p_contract
    returning * into v_row;

  insert into public.notifications (user_id, type, title, body, data, channels)
  values (
    v_row.client_id, 'contract', 'Votre contrat de séjour est prêt',
    'Le contrat ' || v_row.reference || ' vous a été envoyé. Vous pouvez le relire et le signer.',
    jsonb_build_object('contract_id', v_row.id, 'reservation_id', v_row.reservation_id),
    '{in_app,email,push}'::text[]
  );

  return v_row;
end;
$$;
grant execute on function public.send_contract(uuid) to authenticated;

-- ---- sign_contract : n'accepte plus qu'un contrat « sent » ----------
create or replace function public.sign_contract(
  p_contract uuid, p_signature_name text, p_fields jsonb default '{}'::jsonb
) returns public.contracts
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_row public.contracts;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if coalesce(trim(p_signature_name),'') = '' then raise exception 'signature_required'; end if;

  select * into v_row from public.contracts where id = p_contract for update;
  if not found then raise exception 'not_found'; end if;
  if v_row.client_id <> v_uid then raise exception 'forbidden'; end if;
  if v_row.status = 'draft' then raise exception 'not_sent_yet'; end if;
  if v_row.status <> 'sent' then raise exception 'already_signed'; end if;

  update public.contracts set
    status = 'signed',
    terms = v_row.terms || coalesce(p_fields, '{}'::jsonb),
    client_signature_name = p_signature_name,
    client_signed_at = now(),
    updated_at = now()
  where id = p_contract
  returning * into v_row;

  perform public.notify_staff(
    'contract',
    'Contrat signé par un client',
    'Le contrat ' || v_row.reference || ' vient d''être signé.',
    jsonb_build_object('contract_id', v_row.id, 'reservation_id', v_row.reservation_id)
  );

  return v_row;
end;
$$;
grant execute on function public.sign_contract(uuid,text,jsonb) to authenticated;
