-- =====================================================================
--  Comptes d'encaissement de l'équipe (Mobile Money, banque, crypto…)
--
--  L'équipe pré-enregistre ses coordonnées de paiement. Depuis une
--  conversation, elle envoie en un clic une demande de paiement au
--  client : elle coche les comptes à utiliser + le montant, un message
--  formaté part dans la messagerie. Le client règle puis joint sa
--  capture d'écran (mécanisme de preuve existant).
-- =====================================================================

create table if not exists public.payment_accounts (
  id           uuid primary key default gen_random_uuid(),
  kind         text not null default 'momo'
                 check (kind in ('momo','flooz','celtis','bank','card','crypto','other')),
  label        text not null,
  value        text not null,               -- numéro / IBAN / adresse du portefeuille
  holder       text,                        -- titulaire du compte
  instructions text,                        -- consigne éventuelle
  active       boolean not null default true,
  sort         int not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists payment_accounts_active_idx on public.payment_accounts(active, sort);

alter table public.payment_accounts enable row level security;

drop policy if exists payment_accounts_read on public.payment_accounts;
create policy payment_accounts_read on public.payment_accounts for select to authenticated
  using (public.is_staff(auth.uid()));
-- écriture : uniquement via RPC (SECURITY DEFINER)

-- libellé lisible d'un type de compte
create or replace function public.payment_account_kind_label(p_kind text)
returns text language sql immutable as $$
  select case p_kind
    when 'momo'   then 'MTN Mobile Money'
    when 'flooz'  then 'Moov Flooz'
    when 'celtis' then 'Celtiis Cash'
    when 'bank'   then 'Virement bancaire'
    when 'card'   then 'Carte bancaire'
    when 'crypto' then 'Cryptomonnaie'
    else 'Autre'
  end;
$$;

-- ---- RPC : créer / modifier un compte -----------------------------
create or replace function public.staff_upsert_payment_account(
  p_id uuid, p_kind text, p_label text, p_value text,
  p_holder text default null, p_instructions text default null, p_active boolean default true
) returns public.payment_accounts
language plpgsql security definer set search_path = public as $$
declare v_row public.payment_accounts;
begin
  if not public.is_staff(auth.uid()) then raise exception 'forbidden'; end if;
  if p_kind not in ('momo','flooz','celtis','bank','card','crypto','other') then raise exception 'bad_kind'; end if;
  if coalesce(trim(p_label),'') = '' then raise exception 'label_required'; end if;
  if coalesce(trim(p_value),'') = '' then raise exception 'value_required'; end if;

  if p_id is null then
    insert into public.payment_accounts (kind, label, value, holder, instructions, active)
    values (p_kind, btrim(p_label), btrim(p_value), nullif(btrim(p_holder),''),
            nullif(btrim(p_instructions),''), coalesce(p_active, true))
    returning * into v_row;
  else
    update public.payment_accounts set
      kind = p_kind, label = btrim(p_label), value = btrim(p_value),
      holder = nullif(btrim(p_holder),''), instructions = nullif(btrim(p_instructions),''),
      active = coalesce(p_active, true), updated_at = now()
    where id = p_id
    returning * into v_row;
    if not found then raise exception 'not_found'; end if;
  end if;
  return v_row;
end $$;
grant execute on function public.staff_upsert_payment_account(uuid,text,text,text,text,text,boolean) to authenticated;

create or replace function public.staff_delete_payment_account(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff(auth.uid()) then raise exception 'forbidden'; end if;
  delete from public.payment_accounts where id = p_id;
end $$;
grant execute on function public.staff_delete_payment_account(uuid) to authenticated;

-- ---- RPC : envoyer une demande de paiement dans une conversation ---
create or replace function public.staff_send_payment_request(
  p_conversation uuid, p_account_ids uuid[], p_amount numeric default null, p_note text default null
) returns public.messages
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_conv public.conversations;
  v_msg public.messages;
  v_acc public.payment_accounts;
  v_lines text := '';
  v_body text;
  v_extra text;
begin
  if not public.is_staff(v_uid) then raise exception 'forbidden'; end if;
  select * into v_conv from public.conversations where id = p_conversation;
  if not found then raise exception 'conversation_not_found'; end if;

  for v_acc in
    select * from public.payment_accounts
    where id = any(coalesce(p_account_ids, '{}'::uuid[])) and active
    order by sort, created_at
  loop
    v_lines := v_lines || E'\n• ' || public.payment_account_kind_label(v_acc.kind)
      || ' — ' || v_acc.label || E'\n   ' || v_acc.value
      || case when v_acc.holder is not null then '  (' || v_acc.holder || ')' else '' end
      || case when v_acc.instructions is not null then E'\n   ' || v_acc.instructions else '' end;
  end loop;

  if v_lines = '' then
    -- repli : instructions manuelles globales
    select coalesce(manual_instructions,'') into v_extra from public.payment_settings where id = 1;
    v_lines := case when v_extra <> '' then E'\n' || v_extra else E'\n(coordonnées à communiquer par l''équipe)' end;
  end if;

  v_body := 'Demande de paiement'
    || case when p_amount is not null and p_amount > 0
            then ' — ' || to_char(round(p_amount), 'FM999G999G999') || ' XOF' else '' end
    || E'\n\nRéglez sur l''un des comptes suivants :' || v_lines
    || case when coalesce(trim(p_note),'') <> '' then E'\n\n' || btrim(p_note) else '' end
    || E'\n\nUne fois payé, répondez ici avec la capture d''écran du paiement.';

  insert into public.messages (conversation_id, sender_id, body, system)
  values (p_conversation, v_uid, v_body, false)
  returning * into v_msg;

  insert into public.notifications (user_id, type, title, body, data, channels)
  values (v_conv.customer_id, 'payment', 'Demande de paiement',
    'L''équipe vous a transmis les coordonnées pour régler.',
    jsonb_build_object('conversation_id', v_conv.id), '{in_app,email,push}'::text[]);

  return v_msg;
end $$;
grant execute on function public.staff_send_payment_request(uuid, uuid[], numeric, text) to authenticated;

-- ---- staff_send_payment_details : réutilise les comptes -----------
create or replace function public.staff_send_payment_details(
  p_reservation uuid, p_amount numeric default null, p_note text default null
) returns public.messages
language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_res public.reservations;
  v_conv public.conversations;
  v_ids uuid[];
begin
  if not public.has_permission(v_uid, 'reservations.update') then raise exception 'forbidden'; end if;
  select * into v_res from public.reservations where id = p_reservation;
  if not found then raise exception 'reservation_not_found'; end if;

  select * into v_conv from public.conversations
    where customer_id = v_res.guest_id
    order by (type = 'reservation' and reservation_id = p_reservation) desc, last_message_at desc
    limit 1;
  if not found then
    insert into public.conversations (subject, type, reservation_id, customer_id, assigned_staff_id)
    values ('Paiement — séjour ' || v_res.reference, 'reservation', p_reservation, v_res.guest_id, v_uid)
    returning * into v_conv;
  end if;

  select array_agg(id) into v_ids from public.payment_accounts where active;
  return public.staff_send_payment_request(
    v_conv.id, coalesce(v_ids, '{}'::uuid[]), p_amount,
    'Séjour ' || v_res.reference || case when coalesce(trim(p_note),'') <> '' then E'\n' || btrim(p_note) else '' end
  );
end $$;
grant execute on function public.staff_send_payment_details(uuid, numeric, text) to authenticated;

-- quelques comptes de démonstration
insert into public.payment_accounts (kind, label, value, holder, sort)
select * from (values
  ('momo',   'MTN MoMo',        '+229 01 52 00 00 00', 'Les 2 Palmiers', 1),
  ('flooz',  'Moov Flooz',      '+229 01 96 00 00 00', 'Les 2 Palmiers', 2),
  ('bank',   'Ecobank Bénin',   'BJ66 0000 1234 5678 9012 3456 78', 'LES 2 PALMIERS SARL', 3)
) as v(kind, label, value, holder, sort)
where not exists (select 1 from public.payment_accounts);
