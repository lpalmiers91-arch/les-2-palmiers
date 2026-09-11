-- =====================================================================
--  Correctif ACL — le REVOKE ... FROM anon/authenticated ne suffit pas
--  tant que le GRANT implicite à PUBLIC subsiste (les rôles anon /
--  authenticated en héritent). On retire l'exécution à PUBLIC.
-- =====================================================================

-- VULN-10 : verrouillage effectif — plus aucune exécution par UUID.
revoke execute on function public.apartment_ical_events(uuid) from public;
-- (aucun re-grant : seuls le propriétaire et service_role conservent l'accès)

-- Fonctions « simulateur » : PUBLIC / anon retirés ; le corps exige déjà un
-- utilisateur authentifié et applique les contrôles métier.
revoke execute on function public.payment_resolve(uuid, text)         from public, anon;
revoke execute on function public.charge_pay_sim(uuid, text, text)    from public, anon;
revoke execute on function public.wallet_topup_sim(numeric, text, text) from public, anon;

-- Générateur de code cadeau : purement interne (appelé par create_gift_card).
revoke execute on function public.gen_gift_code() from public, anon, authenticated;

-- redeem_gift_card : retrait de PUBLIC (grant explicite à authenticated conservé).
revoke execute on function public.redeem_gift_card(text) from public, anon;
grant  execute on function public.redeem_gift_card(text) to authenticated;
