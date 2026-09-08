-- Les 2 Palmiers — extensions de base
-- Phase 1 : socle. Les extensions vivent dans le schéma `extensions` (convention Supabase).

create extension if not exists pgcrypto      with schema extensions;
create extension if not exists btree_gist     with schema extensions;  -- contrainte d'exclusion des réservations (phase 4/5)
create extension if not exists vector         with schema extensions;  -- base de connaissances de l'assistant IA (phase 11)

-- pg_cron : jobs planifiés (expiration des réservations impayées, rapports programmés).
-- Sur Supabase, pg_cron s'installe dans le schéma `pg_catalog`.
create extension if not exists pg_cron        with schema pg_catalog;
