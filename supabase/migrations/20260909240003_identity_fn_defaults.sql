-- Rend facultatifs les champs non essentiels de submit_identity_verification
-- (date de naissance, nationalité, date d'expiration).

create or replace function public.submit_identity_verification(
  p_legal_full_name text,
  p_document_type text,
  p_document_number text,
  p_selfie_path text,
  p_document_front_path text,
  p_date_of_birth date default null,
  p_nationality text default null,
  p_document_expiry date default null,
  p_document_back_path text default null
) returns public.identity_verifications
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_row public.identity_verifications;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if coalesce(trim(p_legal_full_name),'') = '' then raise exception 'name_required'; end if;
  if coalesce(trim(p_document_number),'') = '' then raise exception 'document_number_required'; end if;
  if coalesce(trim(p_selfie_path),'') = '' or coalesce(trim(p_document_front_path),'') = '' then
    raise exception 'documents_required';
  end if;

  if public.is_identity_verified(v_uid) then raise exception 'already_verified'; end if;

  select * into v_row from public.identity_verifications
    where user_id = v_uid and status = 'pending' limit 1;

  if found then
    update public.identity_verifications set
      legal_full_name = p_legal_full_name,
      date_of_birth = p_date_of_birth,
      nationality = p_nationality,
      document_type = p_document_type,
      document_number = p_document_number,
      document_expiry = p_document_expiry,
      selfie_path = p_selfie_path,
      document_front_path = p_document_front_path,
      document_back_path = p_document_back_path,
      submitted_at = now(),
      updated_at = now()
    where id = v_row.id
    returning * into v_row;
  else
    insert into public.identity_verifications (
      user_id, legal_full_name, date_of_birth, nationality, document_type,
      document_number, document_expiry, selfie_path, document_front_path, document_back_path
    ) values (
      v_uid, p_legal_full_name, p_date_of_birth, p_nationality, p_document_type,
      p_document_number, p_document_expiry, p_selfie_path, p_document_front_path, p_document_back_path
    ) returning * into v_row;
  end if;

  update public.profiles set
    date_of_birth = coalesce(date_of_birth, p_date_of_birth),
    nationality   = coalesce(nationality, p_nationality)
  where id = v_uid;

  perform public.notify_staff(
    'identity',
    'Nouvelle vérification d''identité',
    'Un client a soumis sa pièce d''identité pour validation.',
    jsonb_build_object('verification_id', v_row.id, 'user_id', v_uid)
  );

  return v_row;
end;
$$;

-- l'ancienne signature (9 args positionnels) n'est plus référencée : on la retire
drop function if exists public.submit_identity_verification(text,date,text,text,text,date,text,text,text);

grant execute on function public.submit_identity_verification(text,text,text,text,text,date,text,date,text) to authenticated;
