-- =====================================================================
--  Durcissement de sécurité — suite audit OWASP Top 10
--  (VULN-01, 03, 08, 09, 10, 12, 13, 14)
--
--  Principe : aucune régression métier. Le simulateur de paiement reste
--  utilisable UNIQUEMENT dans le bac à sable de démonstration
--  (payment_settings.active_provider = 'sim'). Dès qu'un vrai prestataire
--  est configuré, seul le webhook signé (service_role) ou un détenteur de
--  la permission 'payments.process' peut encaisser.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------
--  Secrets internes partagés (schéma privé, jamais exposé au client)
--  Utilisés pour authentifier les appels internes DB -> Edge Functions.
-- ---------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from anon, authenticated, public;

create table if not exists private.app_secrets (
  key        text primary key,
  value      text not null,
  created_at timestamptz not null default now()
);
revoke all on table private.app_secrets from anon, authenticated, public;

insert into private.app_secrets (key, value)
values
  ('notify_internal_secret', encode(extensions.gen_random_bytes(24), 'hex')),
  ('ical_sync_secret',       encode(extensions.gen_random_bytes(24), 'hex'))
on conflict (key) do nothing;

create or replace function private.secret(p_key text)
returns text language sql stable security definer set search_path = private as $$
  select value from private.app_secrets where key = p_key;
$$;
revoke all on function private.secret(text) from anon, authenticated, public;

-- =====================================================================
--  VULN-01 — Anti-fraude paiement : payment_resolve
-- =====================================================================
insert into public.permissions (key, label, description) values
  ('payments.process', 'Encaisser un paiement',
   'Résoudre / valider manuellement un paiement (hors webhook PSP signé).')
on conflict (key) do update set label = excluded.label, description = excluded.description;

insert into public.role_permissions (role_id, permission_key) values
  ('admin', 'payments.process'),
  ('staff', 'payments.process')
on conflict do nothing;

create or replace function public.payment_resolve(p_payment uuid, p_outcome text)
returns public.payments
language plpgsql security definer set search_path = public as $$
declare
  v_uid         uuid := auth.uid();
  v_pay         public.payments;
  v_can_process boolean := public.has_permission(v_uid, 'payments.process');
  v_sim_mode    boolean := coalesce(
                  (select active_provider from public.payment_settings where id = 1), 'sim') = 'sim';
begin
  select * into v_pay from public.payments where id = p_payment for update;
  if not found then raise exception 'payment_not_found'; end if;
  if p_outcome not in ('success','failure','pending') then raise exception 'bad_outcome'; end if;

  -- Autorisation :
  --  * détenteur de 'payments.process' (staff/admin)  -> OK
  --  * sinon : uniquement SON paiement, uniquement dans le bac à sable de
  --    démonstration (provider 'sim' + plateforme en mode simulateur).
  --  Le webhook PSP passe par payment_mark_paid_external (service_role).
  if not v_can_process then
    if v_pay.payer_id is distinct from v_uid then raise exception 'forbidden'; end if;
    if v_pay.provider <> 'sim' or not v_sim_mode then
      raise exception 'payment_resolution_forbidden';
    end if;
  end if;

  if v_pay.status <> 'pending' then return v_pay; end if;
  if p_outcome = 'pending' then return v_pay; end if;

  update public.payments set
    status      = case when p_outcome = 'success' then 'paid' else 'failed' end,
    sim_outcome = p_outcome,
    paid_at     = case when p_outcome = 'success' then now() end,
    raw_webhook = jsonb_build_object('sim', true, 'outcome', p_outcome, 'at', now(), 'by', v_uid),
    updated_at  = now()
  where id = p_payment
  returning * into v_pay;

  if p_outcome = 'success' then
    if v_pay.purpose = 'reservation' or v_pay.purpose = 'balance' then
      update public.reservations set
        amount_paid = amount_paid + v_pay.amount,
        status = case when status = 'pending_payment' then 'confirmed' else status end
      where id = v_pay.reservation_id;
      insert into public.reservation_events (reservation_id, type, payload, actor_id)
      values (v_pay.reservation_id, 'paid',
              jsonb_build_object('amount', v_pay.amount, 'payment', v_pay.id), v_uid);
    elsif v_pay.purpose = 'service_order' then
      update public.service_orders set amount_paid = amount_paid + v_pay.amount
      where id = v_pay.service_order_id;
      insert into public.service_order_events (service_order_id, type, payload, actor_id)
      values (v_pay.service_order_id, 'paid',
              jsonb_build_object('amount', v_pay.amount, 'payment', v_pay.id), v_uid);
    end if;
    perform public.loyalty_award_payment(v_pay.id);
  end if;

  return v_pay;
end $$;

revoke execute on function public.payment_resolve(uuid, text) from public;
grant  execute on function public.payment_resolve(uuid, text) to authenticated;

-- Même verrou pour le règlement simulé d'un frais de séjour (même classe de faille).
create or replace function public.charge_pay_sim(p_charge uuid, p_method text, p_outcome text)
returns public.payments
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_row public.reservation_charges;
  v_res public.reservations;
  v_pay public.payments;
  v_ref text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_outcome not in ('success','failed','pending') then raise exception 'bad_outcome'; end if;
  if coalesce((select active_provider from public.payment_settings where id = 1), 'sim') <> 'sim'
     and not public.has_permission(v_uid, 'payments.process') then
    raise exception 'payment_resolution_forbidden';
  end if;

  select * into v_row from public.reservation_charges where id = p_charge;
  if not found then raise exception 'not_found'; end if;
  if v_row.status <> 'pending' then raise exception 'already_settled'; end if;

  select * into v_res from public.reservations where id = v_row.reservation_id;
  if v_res.guest_id <> v_uid then raise exception 'forbidden'; end if;

  v_ref := 'PAY-' || to_char(now(),'YYYYMMDD') || '-' ||
           lpad(nextval('public.payment_ref_seq')::text, 6, '0');

  insert into public.payments (
    internal_ref, provider, sim_outcome, purpose, reservation_id, charge_id, payer_id,
    method, amount, currency, status, channel, paid_at
  ) values (
    v_ref, 'sim', p_outcome, 'charge', v_res.id, v_row.id, v_uid,
    p_method, v_row.amount, v_row.currency,
    case p_outcome when 'success' then 'paid' when 'pending' then 'pending' else 'failed' end,
    'online',
    case when p_outcome = 'success' then now() end
  ) returning * into v_pay;

  return v_pay;
end $$;
revoke execute on function public.charge_pay_sim(uuid, text, text) from public;
grant  execute on function public.charge_pay_sim(uuid, text, text) to authenticated;

-- =====================================================================
--  VULN-03 — Anti-crédit illimité : wallet_topup_sim (admin uniquement)
-- =====================================================================
create or replace function public.wallet_topup_sim(p_amount numeric, p_method text, p_outcome text)
returns public.payments
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_pay public.payments; v_ref text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  -- Le crédit « créé de rien » ne doit jamais être déclenchable par un client.
  if not public.has_role(v_uid, 'admin') then raise exception 'forbidden'; end if;
  if p_outcome not in ('success','failed','pending') then raise exception 'bad_outcome'; end if;
  if p_amount is null or p_amount < 500 or p_amount > 2000000 then raise exception 'amount_out_of_range'; end if;
  if p_method not in ('mtn','moov','celtis','card') then raise exception 'bad_method'; end if;

  v_ref := 'PAY-' || to_char(now(),'YYYYMMDD') || '-' ||
           lpad(nextval('public.payment_ref_seq')::text, 6, '0');

  insert into public.payments (internal_ref, provider, sim_outcome, purpose, payer_id,
    method, amount, currency, status, channel, paid_at)
  values (v_ref, 'sim', p_outcome, 'wallet', v_uid, p_method, round(p_amount), 'XOF',
    case p_outcome when 'success' then 'paid' when 'pending' then 'pending' else 'failed' end,
    'online', case when p_outcome = 'success' then now() end)
  returning * into v_pay;

  return v_pay;
end $$;
-- Le grant 'authenticated' est conservé (un admin se connecte comme
-- 'authenticated') ; le contrôle de rôle 'admin' dans le corps refuse
-- explicitement tout compte non-admin. On retire le grant PUBLIC implicite.
revoke execute on function public.wallet_topup_sim(numeric, text, text) from public;
grant  execute on function public.wallet_topup_sim(numeric, text, text) to authenticated;

-- =====================================================================
--  VULN-12 — Plancher d'acompte 30 % sur create_booking
-- =====================================================================
create or replace function public.create_booking(
  p_apartment uuid,
  p_range daterange,
  p_guests int default 2,
  p_deposit_percent int default 50,
  p_services uuid[] default '{}'
) returns public.reservations
language plpgsql security definer set search_path = public as $$
declare
  v_uid    uuid := auth.uid();
  v_quote  jsonb;
  v_stay   numeric;
  v_svc    public.services;
  v_svc_id uuid;
  v_svc_total numeric := 0;
  v_ref    text;
  v_res    public.reservations;
  v_dep    numeric;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if not public.rl_hit('book:' || v_uid::text, 8, interval '1 hour') then
    raise exception 'rate_limited';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_apartment::text));
  v_quote := public.quote_stay(p_apartment, p_range, p_guests);
  if not (v_quote->>'available')::boolean then raise exception 'dates_unavailable'; end if;
  if (v_quote->>'over_capacity')::boolean then raise exception 'over_capacity'; end if;
  if not (v_quote->>'meets_min_nights')::boolean then raise exception 'below_min_nights'; end if;

  v_stay := (v_quote->>'total')::numeric;

  foreach v_svc_id in array coalesce(p_services, '{}')
  loop
    select * into v_svc from public.services where id = v_svc_id and active;
    if found and v_svc.pricing_mode = 'fixed' and v_svc.base_price is not null then
      v_svc_total := v_svc_total + v_svc.base_price;
    end if;
  end loop;

  -- VULN-12 : acompte minimum incompressible de 30 %
  v_dep := round(v_stay * greatest(least(coalesce(p_deposit_percent, 50), 100), 30) / 100.0) + v_svc_total;

  v_ref := 'L2P-' || to_char(now(),'YYYY') || '-' ||
           lpad(nextval('public.reservation_ref_seq')::text, 5, '0');

  insert into public.reservations (
    reference, apartment_id, guest_id, date_range, guests_count,
    nightly_price, fees, discount_amount, total_amount, deposit_amount, currency, status, source
  ) values (
    v_ref, p_apartment, v_uid, p_range, p_guests,
    round((v_quote->>'lodging_subtotal')::numeric / nullif((v_quote->>'nights')::numeric, 0)),
    jsonb_build_object(
      'cleaning_fee', (v_quote->>'cleaning_fee')::numeric,
      'services_prepaid', v_svc_total
    ),
    (v_quote->>'discount_amount')::numeric,
    v_stay + v_svc_total,
    v_dep,
    'XOF', 'pending_payment', 'web'
  ) returning * into v_res;

  insert into public.reservation_events (reservation_id, type, payload, actor_id)
  values (v_res.id, 'created', jsonb_build_object('quote', v_quote, 'services', p_services), v_uid);

  foreach v_svc_id in array coalesce(p_services, '{}')
  loop
    select * into v_svc from public.services where id = v_svc_id and active;
    if found and v_svc.pricing_mode = 'fixed' and v_svc.base_price is not null then
      insert into public.service_orders (
        reference, service_id, customer_id, reservation_id,
        status, price, payment_timing, note
      ) values (
        'L2P-S-' || to_char(now(),'YYYY') || '-' ||
          lpad(nextval('public.service_order_ref_seq')::text, 5, '0'),
        v_svc_id, v_uid, v_res.id,
        'accepted', v_svc.base_price, 'prepaid',
        'Ajouté à la réservation ' || v_ref
      );
    end if;
  end loop;

  return v_res;
end $$;
grant execute on function public.create_booking(uuid, daterange, int, int, uuid[]) to authenticated;

-- =====================================================================
--  VULN-10 — Confidentialité des plannings iCal (fin de l'énumération UUID)
-- =====================================================================
revoke execute on function public.apartment_ical_events(uuid) from anon, authenticated;

create or replace function public.apartment_ical_events_by_token(p_token text)
returns table (uid text, starts date, ends date, summary text)
language sql stable security definer set search_path = public as $$
  select 'res-' || r.id::text, lower(r.date_range), upper(r.date_range), 'Réservé — Les 2 Palmiers'
  from public.reservations r
  join public.apartments a on a.id = r.apartment_id
  where a.ical_token = p_token
    and length(coalesce(p_token, '')) >= 16
    and r.status in ('pending_payment', 'confirmed', 'in_stay', 'completed')
  union all
  select 'blk-' || b.id::text, lower(b.date_range), upper(b.date_range),
         coalesce(b.note, 'Indisponible')
  from public.availability_blocks b
  join public.apartments a on a.id = b.apartment_id
  where a.ical_token = p_token
    and length(coalesce(p_token, '')) >= 16
    and b.reason <> 'external_ical';
$$;
grant execute on function public.apartment_ical_events_by_token(text) to anon, authenticated;

-- =====================================================================
--  VULN-13 — Anti-brute-force cartes cadeaux + code non prédictible
-- =====================================================================
create or replace function public.gen_gift_code()
returns text language plpgsql as $$
declare
  v_code  text;
  v_alpha text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_rand  bytea;
  i int;
begin
  loop
    v_rand := extensions.gen_random_bytes(8);
    v_code := 'GIFT-';
    for i in 1..8 loop
      v_code := v_code || substr(v_alpha, 1 + (get_byte(v_rand, i - 1) % length(v_alpha)), 1);
      if i = 4 then v_code := v_code || '-'; end if;
    end loop;
    exit when not exists (select 1 from public.gift_cards where code = v_code);
  end loop;
  return v_code;
end $$;

create or replace function public.redeem_gift_card(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_card public.gift_cards;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  -- VULN-13 : 5 tentatives / heure / utilisateur
  if not public.rl_hit('gift_redeem:' || v_uid::text, 5, interval '1 hour') then
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

-- =====================================================================
--  VULN-14 — Saturation d'analytics_events : écriture via RPC uniquement
-- =====================================================================
drop policy if exists analytics_insert on public.analytics_events;
revoke insert on public.analytics_events from anon, authenticated;
-- public.track_event (SECURITY DEFINER, borne + rate-limit) reste la seule voie d'écriture.

-- =====================================================================
--  VULN-08 / 09 — Appels internes DB -> Edge Functions authentifiés
-- =====================================================================
create or replace function public.dispatch_notification()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  perform net.http_post(
    url     := public.notify_endpoint(),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.notify_anon_key(),
      'x-internal-secret', private.secret('notify_internal_secret')
    ),
    body    := jsonb_build_object('notification_id', new.id),
    timeout_milliseconds := 8000
  );
  return new;
exception when others then
  return new;
end;
$$;

create or replace function public.trigger_ical_sync()
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform net.http_post(
    url     := 'https://zmobadwgoqcwkryefciq.supabase.co/functions/v1/ical-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || public.notify_anon_key(),
      'x-cron-secret', private.secret('ical_sync_secret')
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
exception when others then
  null;
end $$;
