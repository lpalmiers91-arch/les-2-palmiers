-- =====================================================================
--  Réservation de démonstration pour le compte client@les2palmiers.site
--  Séjour confirmé à venir, acompte payé, solde restant, contrat à signer.
--  Rend visibles : onglet séjour / Wi-Fi, avis, paiement du solde,
--  signature du contrat, points de fidélité sur paiement.
--  Idempotent : ne fait rien si le client a déjà une réservation.
-- =====================================================================
do $$
declare
  v_client  uuid;
  v_apt     uuid;
  v_range   daterange;
  v_quote   jsonb;
  v_total   numeric;
  v_deposit numeric;
  v_res     public.reservations;
  v_pay_id  uuid;
begin
  select id into v_client from auth.users where email = 'client@les2palmiers.site';
  select id into v_apt from public.apartments where name ilike 'Les 2 Palmiers%' order by created_at limit 1;
  if v_client is null or v_apt is null then return; end if;
  if exists (select 1 from public.reservations where guest_id = v_client) then return; end if;

  v_range := daterange((current_date + 21), (current_date + 26));
  v_quote := public.quote_stay(v_apt, v_range, 2);
  if not coalesce((v_quote->>'available')::boolean, false) then
    v_range := daterange((current_date + 45), (current_date + 50));
    v_quote := public.quote_stay(v_apt, v_range, 2);
  end if;
  if not coalesce((v_quote->>'available')::boolean, false) then return; end if;

  v_total   := (v_quote->>'total')::numeric;
  v_deposit := round(v_total * 0.30);

  insert into public.reservations (
    reference, apartment_id, guest_id, date_range, guests_count,
    nightly_price, fees, discount_amount, total_amount, deposit_amount,
    amount_paid, currency, status, source
  ) values (
    'L2P-' || to_char(now(),'YYYY') || '-' || lpad(nextval('public.reservation_ref_seq')::text, 5, '0'),
    v_apt, v_client, v_range, 2,
    round((v_quote->>'lodging_subtotal')::numeric / nullif((v_quote->>'nights')::numeric, 0)),
    jsonb_build_object('cleaning_fee', (v_quote->>'cleaning_fee')::numeric),
    (v_quote->>'discount_amount')::numeric,
    v_total, v_deposit, v_deposit, 'XOF', 'confirmed', 'web'
  ) returning * into v_res;

  insert into public.reservation_events (reservation_id, type, payload) values
    (v_res.id, 'created',        jsonb_build_object('quote', v_quote)),
    (v_res.id, 'deposit_paid',   jsonb_build_object('amount', v_deposit, 'method', 'mtn')),
    (v_res.id, 'status_changed', jsonb_build_object('from', 'pending_payment', 'to', 'confirmed'));

  insert into public.payments (
    internal_ref, provider, sim_outcome, purpose, reservation_id, payer_id,
    method, amount, currency, status, paid_at
  ) values (
    'PMT-' || to_char(now(),'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 6),
    'sim', 'success', 'reservation', v_res.id, v_client,
    'mtn', v_deposit, 'XOF', 'paid', now()
  ) returning id into v_pay_id;

  -- points de fidélité gagnés sur l'acompte encaissé
  begin
    perform public.loyalty_award_payment(v_pay_id);
  exception when others then null;
  end;
end $$;
