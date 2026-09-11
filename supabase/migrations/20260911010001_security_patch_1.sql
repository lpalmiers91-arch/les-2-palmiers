-- =====================================================================
--  Security patch 1 — SEC-04 / SEC-06
--  Recherche d'un compte par e-mail sans charger la liste des utilisateurs.
--
--  admin-invite et staff-booking utilisaient `listUsers({ perPage: 200|1000 })`
--  puis un .find() côté Deno : coûteux, ne passe pas à l'échelle, et charge
--  potentiellement des centaines/milliers de comptes en mémoire pour un seul
--  lookup. La GoTrue Admin REST API ne supporte pas de filtre `email=eq.`
--  (seulement `page`/`per_page`) : on résout donc le lookup par une fonction
--  SQL sur auth.users, indexée sur email, exécutée par le service_role.
--
--  Portée : SECURITY DEFINER, AUCUN accès accordé à anon/authenticated —
--  seule la clé service_role (Edge Functions) peut l'appeler.
-- =====================================================================

create or replace function public.admin_find_user_by_email(p_email text)
returns uuid
language sql stable security definer set search_path = public, auth as $$
  select id from auth.users where lower(email) = lower(btrim(p_email)) limit 1;
$$;

revoke all on function public.admin_find_user_by_email(text) from public, anon, authenticated;
grant execute on function public.admin_find_user_by_email(text) to service_role;

-- Rappel RLS : cette fonction ne touche à aucune table applicative ; elle ne
-- change donc aucune policy existante.
