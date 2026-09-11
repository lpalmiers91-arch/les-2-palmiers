-- =====================================================================
--  CORRECTIF 1 (CRITIQUE) — Révocation du grant SELECT de masse à `anon`
--
--  Constat vérifié en base (pas seulement dans le fichier source) :
--    grant select on all tables in schema public to anon;   -- 20260909120002, ligne 211
--  Mais la vraie cause racine est plus large : Supabase configure par
--  défaut, au niveau du schéma, un DEFAULT PRIVILEGE qui donne à `anon` ET
--  `authenticated` l'intégralité des droits (SELECT/INSERT/UPDATE/DELETE...)
--  sur CHAQUE NOUVELLE table créée par le rôle `postgres` (celui qui exécute
--  toutes les migrations de ce projet) :
--
--    select pg_get_userbyid(defaclrole), defaclacl from pg_default_acl
--      where defaclnamespace = 'public'::regnamespace and defaclobjtype='r';
--    -- postgres=arwdDxtm/postgres, anon=arwdDxtm/postgres, authenticated=arwdDxtm/postgres, ...
--
--  Un simple REVOKE sur les tables existantes serait donc écrasé dès la
--  prochaine migration créant une table : cette migration corrige donc
--  À LA FOIS l'état actuel ET le défaut qui le recrée.
--
--  Portée : anon UNIQUEMENT (correctif demandé). Le même défaut accorde
--  aussi INSERT/UPDATE/DELETE à `authenticated` sur toutes les tables —
--  c'est un problème distinct, plus large, signalé séparément (voir le
--  résumé de session) car sa correction exige un audit table par table des
--  policies d'écriture pour ne rien casser ; il n'est PAS traité ici.
--
--  Vérifié le jour de l'écriture : `select relname from pg_class ... where
--  not relrowsecurity` renvoie 0 ligne — la RLS est active sur les 59 tables
--  de `public`. Ce correctif retire donc un filet de sécurité redondant
--  aujourd'hui (RLS bloque déjà tout ce que ce grant ne devrait pas
--  permettre), mais élimine le risque qu'une future table oubliant sa
--  policy de lecture se retrouve, par défaut, lisible par n'importe qui.
-- =====================================================================

-- 1. État actuel : retire le SELECT de masse sur tout ce qui existe
--    aujourd'hui (tables ET vues — le grant "on all tables" couvre aussi
--    les vues en PostgreSQL).
revoke select on all tables in schema public from anon;

-- 2. Le défaut lui-même : sans ceci, la prochaine `create table` (migration
--    exécutée par `postgres`, propriétaire de tout le schéma) redonnerait
--    silencieusement SELECT à anon.
alter default privileges for role postgres in schema public
  revoke select on tables from anon;

-- 3. Ré-accorde SELECT à anon UNIQUEMENT sur les tables où une policy RLS
--    autorise déjà explicitement une lecture anonyme/publique — vérifié par :
--      select tablename, policyname, roles, qual from pg_policies
--        where schemaname='public' and (roles::text like '%anon%' or roles::text = '{public}');
--    (le rôle `public` en RLS inclut `anon`.) Aucune de ces tables ne
--    contient de PII : la policy elle-même filtre déjà les lignes montrées
--    (ex. status = 'published', apartment visible, service actif...).
grant select on
  public.apartments,              -- apartments_read_published : uniquement status='published' (ou staff)
  public.apartment_media,         -- media_read : photos des appartements visibles
  public.apartment_amenities,     -- amenities_read : équipements des appartements visibles
  public.destinations,            -- destinations_read : contenu tourisme, aucune donnée privée
  public.kb_articles,             -- kb_read : uniquement audience='public'
  public.price_rules,             -- price_rules_read : grille tarifaire publique (nécessaire au devis en ligne)
  public.reviews,                 -- reviews_read_published : uniquement status='published'
  public.seo_meta,                -- seo_meta_read : méta-données SEO des pages, publiques par nature
  public.service_categories,      -- service_categories_read : catalogue public
  public.services,                -- services_read : uniquement active=true (ou staff)
  public.site_blocks,             -- site_blocks_read : blocs des pages publiées uniquement
  public.site_pages,              -- site_pages_read : uniquement status='published'
  public.site_settings            -- site_settings_read : identité/contact de l'entreprise, public par nature
  to anon;

-- Explicitement PAS regrantées à anon (aucune policy RLS ne l'autorise, donc
-- un grant SELECT serait de toute façon sans effet réel — mais on ne le
-- donne pas, pour ne pas laisser un signal trompeur dans les ACL) :
--   profiles, user_roles, reservations, payments, messages, notifications,
--   audit_log, analytics_events, gift_cards, loyalty_accounts, loyalty_ledger,
--   staff_members, contracts, invoices, ai_threads, ai_messages,
--   push_subscriptions, contact_messages, availability_blocks,
--   reservation_events, reservation_charges, reservation_change_requests,
--   conversations, message_reads, identity_verifications, refunds,
--   service_orders, service_order_events, providers, referral_codes,
--   referrals, canned_responses, rate_limits, wallet_accounts, wallet_ledger,
--   payment_accounts, payment_settings, ai_settings, ai_usage,
--   apartment_ical_feeds, stay_info, loyalty_settings.
--
-- roles / permissions / role_permissions : vérifiés — aucune policy RLS
-- n'autorise anon (ni même authenticated hors staff) à les lire ; le modèle
-- de permissions interne n'a aucune raison d'être exposé à un visiteur non
-- connecté. Le frontend public ne les interroge jamais directement (les
-- contrôles passent par les RPC has_permission / auth_has_permission,
-- SECURITY DEFINER). Pas de grant anon ici.
