-- =====================================================================
--  Security patch 2 — SEC-11 : audit_log, immuabilité (vérification + durcissement explicite)
--
--  État constaté (migration 20260909180001_audit_log.sql, déjà en place) :
--   1. `trg_audit_log_immutable` — trigger BEFORE UPDATE OR DELETE qui lève
--      une exception INCONDITIONNELLEMENT, quel que soit le rôle appelant.
--      C'est la protection qui compte réellement : à la différence d'une
--      policy RLS, un trigger BEFORE s'applique aussi à service_role (qui a
--      l'attribut BYPASSRLS et ignorerait donc une simple policy `using (false)`).
--   2. RLS activée sur audit_log, avec UNE SEULE policy, en lecture
--      (`audit_log_read`, réservée à 'audit.view'). Aucune policy INSERT/
--      UPDATE/DELETE n'existe : par défaut, RLS refuse tout accès non
--      couvert par une policy permissive.
--   3. `revoke update, delete on public.audit_log from authenticated, anon`
--      déjà exécuté ; aucun grant INSERT n'a jamais été donné à ces rôles.
--
--  Conclusion : ajouter des policies `for delete/update using (false)`
--  n'apporterait AUCUNE protection supplémentaire (elles seraient de simples
--  policies permissives, sans effet tant qu'aucune autre policy permissive
--  n'autorise l'action — donc redondantes avec l'absence actuelle de policy —
--  et de toute façon inopérantes face à service_role qui bypasse RLS). On
--  rend ici les REVOKE explicites pour les trois rôles applicatifs et on
--  documente la garantie réelle (le trigger), sans registrer de fausse
--  protection.
-- =====================================================================

revoke insert, update, delete on public.audit_log from authenticated, anon;
-- service_role : privilège de table non révoqué (il bypasserait RLS et un
-- éventuel revoke de toute façon en tant que rôle superutilisateur-like côté
-- Supabase) — la garantie contre l'altération, y compris par service_role,
-- reste le trigger `trg_audit_log_immutable` (BEFORE UPDATE OR DELETE, lève
-- systématiquement une exception). Vérification :
--   select tgname, tgenabled from pg_trigger where tgrelid = 'public.audit_log'::regclass;
--   -- doit lister trg_audit_log_immutable avec tgenabled = 'O' (origin, actif)

comment on function public.audit_log_immutable() is
  'Bloque INCONDITIONNELLEMENT tout UPDATE/DELETE sur audit_log, y compris pour service_role. '
  'C''est la garantie d''immuabilité réelle (SEC-11) — les policies RLS seules ne suffiraient pas '
  'car service_role a l''attribut BYPASSRLS.';

-- Policies actives après ce correctif (rappel, aucun changement de policy ici) :
--   audit_log_read  : SELECT to authenticated using (has_permission(auth.uid(),'audit.view'))
--   (aucune policy INSERT / UPDATE / DELETE — refus par défaut)
