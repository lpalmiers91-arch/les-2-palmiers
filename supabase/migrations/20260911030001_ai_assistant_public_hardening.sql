-- =====================================================================
--  CORRECTIF 9 (MOYEN-ÉLEVÉ) — ai-assistant, espace "public" non authentifié
--
--  Constat (audit sécurité) : l'espace "public" de l'assistant IA est
--  appelable sans authentification. Le quota existant (public.ai_usage)
--  n'est vérifié/incrémenté QUE si un userId est présent (voir
--  supabase/functions/ai-assistant/index.ts) — un appelant anonyme peut
--  donc appeler l'Edge Function en boucle, sans aucune limite, ce qui
--  expose à une facture IA arbitraire dès qu'un vrai fournisseur payant
--  est configuré (AI_PROVIDER != echo). AI_MONTHLY_BUDGET_USD était décrit
--  dans .env.example comme un "coupe-circuit de coût" mais n'était lu
--  nulle part dans le code : un garde-fou documenté mais jamais implémenté.
--
--  Correctif :
--   1. rl_hit(...) par IP pour les appels sans utilisateur connecté
--      (appliqué côté Edge Function, voir index.ts).
--   2. suivi réel du coût agrégé (authentifié + anonyme) et fonction pour
--      le lire, afin que le coupe-circuit AI_MONTHLY_BUDGET_USD devienne
--      vérifiable côté Edge Function.
-- =====================================================================

-- Usage agrégé des appelants anonymes (pas de user_id : un seul compteur
-- global par jour). RLS activée sans policy -> personne (anon/authenticated)
-- n'y a accès ; seul service_role (qui contourne RLS) l'alimente et le lit,
-- exactement comme public.ai_usage aujourd'hui.
create table if not exists public.ai_usage_anon (
  day          date primary key default current_date,
  messages     int not null default 0,
  tokens_out   bigint not null default 0,
  est_cost_usd numeric(10,4) not null default 0
);
alter table public.ai_usage_anon enable row level security;

create or replace function public.increment_ai_usage_anon(
  p_tokens_out bigint default 0, p_cost_usd numeric default 0
) returns void
language sql security definer set search_path = public as $$
  insert into public.ai_usage_anon (day, messages, tokens_out, est_cost_usd)
  values (current_date, 1, p_tokens_out, p_cost_usd)
  on conflict (day) do update set
    messages     = ai_usage_anon.messages + 1,
    tokens_out   = ai_usage_anon.tokens_out + excluded.tokens_out,
    est_cost_usd = ai_usage_anon.est_cost_usd + excluded.est_cost_usd;
$$;
revoke all on function public.increment_ai_usage_anon(bigint, numeric) from public;
grant execute on function public.increment_ai_usage_anon(bigint, numeric) to service_role;

-- public.ai_usage.est_cost_usd existe déjà (colonne jamais alimentée) :
-- increment_ai_usage gagne un paramètre optionnel pour l'alimenter. Un
-- paramètre ajouté avec valeur par défaut change la signature de la
-- fonction : `create or replace` seul créerait une SECONDE fonction
-- surchargée (uuid, bigint, bigint) à côté de la nouvelle, et un appel à
-- 3 arguments deviendrait ambigu entre les deux (erreur "not unique").
-- On supprime donc explicitement l'ancienne signature avant de recréer.
drop function if exists public.increment_ai_usage(uuid, bigint, bigint);

create or replace function public.increment_ai_usage(
  p_user uuid, p_tokens_in bigint default 0, p_tokens_out bigint default 0,
  p_cost_usd numeric default 0
) returns void
language sql security definer set search_path = public as $$
  insert into public.ai_usage (user_id, day, messages, tokens_in, tokens_out, est_cost_usd)
  values (p_user, current_date, 1, p_tokens_in, p_tokens_out, p_cost_usd)
  on conflict (user_id, day) do update set
    messages     = ai_usage.messages + 1,
    tokens_in    = ai_usage.tokens_in + excluded.tokens_in,
    tokens_out   = ai_usage.tokens_out + excluded.tokens_out,
    est_cost_usd = ai_usage.est_cost_usd + excluded.est_cost_usd;
$$;
grant execute on function public.increment_ai_usage(uuid, bigint, bigint, numeric) to authenticated, service_role;

-- Coût total (authentifié + anonyme) du mois calendaire en cours. Le
-- coupe-circuit AI_MONTHLY_BUDGET_USD (Edge Function) compare ce total au
-- budget avant tout appel au fournisseur IA payant.
create or replace function public.ai_monthly_cost_usd()
returns numeric
language sql security definer set search_path = public stable as $$
  select
    coalesce((select sum(est_cost_usd) from public.ai_usage
              where day >= date_trunc('month', current_date)), 0)
    +
    coalesce((select sum(est_cost_usd) from public.ai_usage_anon
              where day >= date_trunc('month', current_date)), 0);
$$;
revoke all on function public.ai_monthly_cost_usd() from public;
grant execute on function public.ai_monthly_cost_usd() to service_role;
