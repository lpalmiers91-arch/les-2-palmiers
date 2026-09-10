-- Démo : quelques frais de séjour + un solde de compte pour le client de démo,
-- afin que les nouvelles fonctionnalités soient visibles immédiatement.
do $$
declare
  v_client uuid;
  v_res    uuid;
begin
  select id into v_client from auth.users where email = 'client@les2palmiers.site';
  if v_client is null then return; end if;

  select id into v_res from public.reservations
   where guest_id = v_client and reference = 'L2P-2026-00003';
  if v_res is null then return; end if;

  if not exists (select 1 from public.reservation_charges where reservation_id = v_res) then
    insert into public.reservation_charges (reservation_id, kind, label, amount, note, status)
    values
      (v_res, 'deposit', 'Caution remboursable', 150000,
       'Restituée sous 7 jours après le départ, déduction faite des éventuels dégâts.', 'pending'),
      (v_res, 'utility', 'Consommations électricité (climatisation)', 18500,
       'Relevé du compteur au 12 du mois.', 'pending');
  end if;

  -- solde de démonstration : 75 000 XOF
  insert into public.wallet_accounts (user_id, balance) values (v_client, 0)
    on conflict (user_id) do nothing;
  if coalesce((select balance from public.wallet_accounts where user_id = v_client), 0) = 0
     and not exists (select 1 from public.wallet_ledger where user_id = v_client) then
    perform public.wallet_apply(v_client, 'topup', 75000, null, 'Recharge de bienvenue (démo)');
  end if;
end $$;
