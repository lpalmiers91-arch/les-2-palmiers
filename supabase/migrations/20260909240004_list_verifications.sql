-- Liste des dossiers KYC pour le staff (jointure e-mail depuis auth.users).

create or replace function public.list_identity_verifications()
returns table (
  id uuid,
  user_id uuid,
  status text,
  legal_full_name text,
  date_of_birth date,
  nationality text,
  document_type text,
  document_number text,
  document_expiry date,
  selfie_path text,
  document_front_path text,
  document_back_path text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  rejection_reason text,
  client_name text,
  client_email text
)
language sql security definer set search_path = public as $$
  select
    v.id, v.user_id, v.status, v.legal_full_name, v.date_of_birth, v.nationality,
    v.document_type, v.document_number, v.document_expiry,
    v.selfie_path, v.document_front_path, v.document_back_path,
    v.submitted_at, v.reviewed_at, v.rejection_reason,
    p.full_name as client_name,
    u.email::text as client_email
  from public.identity_verifications v
  left join public.profiles p on p.id = v.user_id
  left join auth.users u on u.id = v.user_id
  where public.has_permission(auth.uid(), 'identity.review')
  order by (v.status = 'pending') desc, v.submitted_at desc;
$$;

grant execute on function public.list_identity_verifications() to authenticated;
