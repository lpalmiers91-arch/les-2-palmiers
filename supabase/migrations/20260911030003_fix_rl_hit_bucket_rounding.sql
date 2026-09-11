-- =====================================================================
--  Correctif — bug d'arrondi dans rl_hit() (découvert en testant le
--  rate-limit anonyme de ai-assistant, CORRECTIF 9)
--
--  Constat, reproduit en direct :
--    select extract(epoch from now())::bigint % 3600,
--           date_trunc('second', now())
--             - (extract(epoch from now())::bigint % 3600) * interval '1 second';
--  `extract(epoch from now())::bigint` ARRONDIT (round) au lieu de tronquer,
--  alors que `date_trunc('second', now())` TRONQUE (floor). Dès que la
--  partie fractionnaire de now() est >= 0.5s (~1 appel sur 2, au hasard),
--  le cast arrondit à la seconde SUIVANTE tandis que date_trunc reste sur
--  la seconde courante — décalage d'1 seconde entre les deux bases. Ce
--  décalage n'est anodin que loin d'une frontière de fenêtre ; dès qu'il
--  traverse un multiple de la fenêtre (ex. le passage à l'heure pleine
--  pour une fenêtre 1h), le bucket calculé tombe sur "HH:59:59" au lieu de
--  "HH+1:00:00" — un bucket fantôme distinct qui repart de zéro. Résultat :
--  le compteur d'une fenêtre est scindé en ~2 buckets indépendants, et le
--  vrai plafond effectif est environ le DOUBLE de p_max. Vérifié en testant
--  le rate-limit anonyme de ai-assistant (CORRECTIF 9) : 22 appels en moins
--  de 2 minutes se sont répartis sur 4 buckets distincts (aucun n'a dépassé
--  20), aucun n'a été bloqué.
--
--  Ce bug affecte TOUTES les fenêtres (pas seulement 1h) et TOUS les
--  appelants existants de rl_hit (redeem_gift_card, submit_contact_message,
--  track_event, le rate-limit IP de ai-assistant) : le correctif renforce
--  chacun d'eux au niveau documenté, sans changer leur comportement pour un
--  appelant qui reste sous la limite (l'écart ne fait qu'affaiblir la
--  limite, jamais la resserrer indûment).
--
--  Correction : `floor(extract(epoch from ...))` au lieu de `::bigint`
--  (qui arrondit) pour aligner les deux bases sur la même sémantique de
--  troncature.
-- =====================================================================

create or replace function public.rl_hit(p_key text, p_max int, p_window interval default interval '1 hour')
returns boolean language plpgsql security definer set search_path = public as $$
declare
  v_now_epoch bigint := floor(extract(epoch from now()));
  v_window_s  bigint := greatest(1, floor(extract(epoch from p_window))::bigint);
  v_start timestamptz := date_trunc('second', now()) - (v_now_epoch % v_window_s) * interval '1 second';
  v_hits int;
begin
  insert into public.rate_limits (bucket, window_start, hits)
    values (p_key, v_start, 1)
  on conflict (bucket, window_start)
    do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;

  -- ménage opportuniste
  delete from public.rate_limits where window_start < now() - interval '1 day';

  return v_hits <= p_max;  -- true = autorisé
end $$;

-- grants identiques à la version d'origine (create or replace conserve
-- l'ACL existante, mais on le rend explicite pour ne dépendre de rien).
grant execute on function public.rl_hit(text, int, interval) to anon, authenticated, service_role;
