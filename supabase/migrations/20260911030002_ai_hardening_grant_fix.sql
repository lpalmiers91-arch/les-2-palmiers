-- =====================================================================
--  CORRECTIF 9 (suite) — fuite de grant sur ai_monthly_cost_usd() et
--  increment_ai_usage_anon()
--
--  Constat post-application de 20260911030001 : ces deux fonctions restent
--  exécutables par anon ET authenticated malgré le
--  `revoke all on function ... from public;` qu'elles contiennent déjà.
--
--  Cause : Supabase configure par défaut, au niveau du schéma, un DEFAULT
--  PRIVILEGE qui donne EXECUTE à anon/authenticated/service_role sur CHAQUE
--  NOUVELLE fonction créée par le rôle `postgres` — vérifié via :
--    select defaclacl from pg_default_acl
--      where defaclnamespace='public'::regnamespace and defaclobjtype='f';
--    -- postgres=X/postgres, anon=X/postgres, authenticated=X/postgres, ...
--  Ce sont des grants DIRECTS à anon/authenticated, pas hérités de PUBLIC :
--  `revoke all ... from public` (qui ne touche que le pseudo-rôle PUBLIC)
--  ne les retire donc pas. C'est le même mécanisme racine que celui déjà
--  documenté pour les tables dans 20260911020001_revoke_anon_mass_grant.sql,
--  ici sur les routines. Ce défaut est d'ailleurs voulu par la plateforme
--  (il permet à toute nouvelle fonction d'être appelée via supabase.rpc()
--  sans grant manuel) — le patron établi ailleurs dans ce projet (voir
--  admin_find_user_by_email, 20260911010001) est donc de révoquer
--  EXPLICITEMENT `public, anon, authenticated` sur les fonctions qui ne
--  doivent être appelées QUE par service_role, plutôt que de toucher au
--  défaut du schéma (qui casserait toutes les autres RPC public-facing).
--
--  Impact réel avant correction : n'importe quel visiteur (clé anon) ou
--  utilisateur connecté pouvait appeler ai_monthly_cost_usd() (fuite mineure
--  du montant dépensé ce mois) et, plus sérieusement,
--  increment_ai_usage_anon(p_tokens_out, p_cost_usd) directement, et donc
--  injecter un coût arbitraire dans ai_usage_anon pour déclencher
--  prématurément le coupe-circuit AI_MONTHLY_BUDGET_USD (déni de service sur
--  l'assistant IA, sans même passer par l'Edge Function).
-- =====================================================================

revoke execute on function public.ai_monthly_cost_usd() from public, anon, authenticated;
revoke execute on function public.increment_ai_usage_anon(bigint, numeric) from public, anon, authenticated;

-- re-confirme (idempotent) l'accès service_role attendu
grant execute on function public.ai_monthly_cost_usd() to service_role;
grant execute on function public.increment_ai_usage_anon(bigint, numeric) to service_role;
