-- =====================================================================
--  CORRECTIF 4 (HAUTE) — Anti-abus multi-comptes sur redeem_gift_card
--
--  Constat : le rate-limit existant (VULN-13, 5 tentatives/heure/UTILISATEUR)
--  ne protège pas contre un attaquant qui crée de nombreux comptes jetables
--  (email-only auth, coût de création ~nul) pour explorer l'espace des codes
--  cadeaux. Il faut un second verrou par IP source.
--
--  Écart assumé par rapport à la demande initiale : la demande proposait de
--  changer la signature en redeem_gift_card(p_code text, p_ip text) et de
--  faire porter l'IP par l'appelant Next.js. Cette approche a été REJETÉE
--  volontairement : `redeem_gift_card` est appelée directement depuis le
--  navigateur via `supabase.rpc(...)` (src/components/app/gift-card-panel.tsx)
--  — un attaquant peut donc appeler cette RPC lui-même depuis la console et
--  fournir N'IMPORTE QUELLE valeur pour p_ip, ce qui annule totalement la
--  protection anti-multi-comptes recherchée (il suffirait de changer p_ip à
--  chaque compte jetable). La signature de la fonction reste donc INCHANGÉE
--  (aucune migration de types, aucun changement du composant appelant) et
--  l'IP réelle est lue côté serveur, à l'intérieur même de la fonction,
--  depuis le GUC `request.headers` que PostgREST (la couche REST utilisée
--  par supabase-js derrière la passerelle) expose pour CHAQUE requête RPC :
--  c'est la passerelle elle-même, pas le client, qui y ajoute la dernière
--  valeur de x-forwarded-for à partir de la connexion TCP réelle — un client
--  peut forger les segments précédents de cet en-tête, pas le dernier.
-- =====================================================================

create or replace function public.redeem_gift_card(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_card public.gift_cards;
  v_xff  text;
  v_ip   text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;

  -- IP réelle vue par la passerelle (dernier maillon de x-forwarded-for) ;
  -- 'unknown' si l'en-tête est absent (appel direct hors PostgREST, ex. SQL editor).
  v_xff := nullif(btrim(coalesce(current_setting('request.headers', true)::json->>'x-forwarded-for', '')), '');
  v_ip := case
    when v_xff is null then 'unknown'
    else btrim((string_to_array(v_xff, ','))[array_upper(string_to_array(v_xff, ','), 1)])
  end;

  -- VULN-13 : 5 tentatives / heure / utilisateur
  if not public.rl_hit('gift_redeem:' || v_uid::text, 5, interval '1 hour') then
    raise exception 'rate_limited';
  end if;
  -- CORRECTIF 4 : 30 tentatives / heure / IP — couvre le contournement par
  -- comptes jetables multiples (le compte change, l'IP de l'attaquant non).
  if not public.rl_hit('gift_redeem_ip:' || v_ip, 30, interval '1 hour') then
    raise exception 'rate_limited';
  end if;

  select * into v_card from public.gift_cards where code = upper(btrim(p_code)) for update;
  if not found then raise exception 'code_invalid'; end if;
  if v_card.status not in ('active') or v_card.balance <= 0 then raise exception 'card_unusable'; end if;
  if v_card.expires_at is not null and v_card.expires_at < now() then raise exception 'card_expired'; end if;

  update public.gift_cards
    set balance = 0, status = 'depleted', redeemed_by = v_uid
    where id = v_card.id;

  insert into public.loyalty_accounts (client_id, credit_xof)
  values (v_uid, v_card.balance)
  on conflict (client_id) do update set credit_xof = public.loyalty_accounts.credit_xof + v_card.balance;

  insert into public.loyalty_ledger (client_id, delta, reason, ref, note)
  values (v_uid, 0, 'gift_card', v_card.id::text, 'Carte cadeau ' || v_card.code);

  return jsonb_build_object('credited', v_card.balance);
end $$;

comment on function public.redeem_gift_card(text) is
  'Signature inchangée (voir en-tête de migration) : IP lue côté serveur via request.headers, jamais fournie par le client.';
