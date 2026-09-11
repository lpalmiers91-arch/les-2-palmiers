-- =====================================================================
--  Security patch 3 — SEC-12 : rotation du jeton d'export iCal
--  Si un jeton fuite (logs, capture d'écran, lien partagé par erreur), il
--  doit pouvoir être révoqué sans dépendre d'une intervention manuelle en base.
-- =====================================================================

create or replace function public.rotate_ical_token(p_apartment uuid)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_new    text;
  v_uid    uuid := auth.uid();
  v_exists uuid;
begin
  if not public.has_permission(v_uid, 'apartments.edit') then
    raise exception 'forbidden';
  end if;

  select id into strict v_exists from public.apartments where id = p_apartment; -- 404 propre si absent
  v_new := encode(extensions.gen_random_bytes(24), 'hex');

  update public.apartments set ical_token = v_new where id = p_apartment;

  return v_new;
exception
  when no_data_found then
    raise exception 'apartment_not_found';
end $$;

revoke all on function public.rotate_ical_token(uuid) from public, anon;
grant execute on function public.rotate_ical_token(uuid) to authenticated;

-- Rappel RLS : `apartments` n'est pas modifiée ici — l'écriture de
-- `ical_token` passe exclusivement par cette RPC (SECURITY DEFINER), gardée
-- par `has_permission(..., 'apartments.edit')`, comme le reste des mutations
-- de la table (policy `apartments` déjà réservée à ce même droit).
