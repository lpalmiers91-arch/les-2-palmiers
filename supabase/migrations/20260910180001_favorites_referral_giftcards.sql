-- =====================================================================
--  Favoris · Parrainage · Cartes cadeaux
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. FAVORIS
-- ---------------------------------------------------------------------
create table if not exists public.favorites (
  client_id    uuid not null references public.profiles(id) on delete cascade,
  apartment_id uuid not null references public.apartments(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (client_id, apartment_id)
);
alter table public.favorites enable row level security;

drop policy if exists favorites_own on public.favorites;
create policy favorites_own on public.favorites
  for all to authenticated
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

create or replace function public.toggle_favorite(p_apartment uuid)
returns boolean language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_exists boolean;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select true into v_exists from public.favorites where client_id = v_uid and apartment_id = p_apartment;
  if v_exists then
    delete from public.favorites where client_id = v_uid and apartment_id = p_apartment;
    return false;
  else
    insert into public.favorites (client_id, apartment_id) values (v_uid, p_apartment)
    on conflict do nothing;
    return true;
  end if;
end $$;
grant execute on function public.toggle_favorite(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 2. PARRAINAGE
-- ---------------------------------------------------------------------
alter table public.loyalty_settings
  add column if not exists referral_referrer_points int not null default 500,
  add column if not exists referral_referred_points int not null default 300;

create table if not exists public.referral_codes (
  client_id  uuid primary key references public.profiles(id) on delete cascade,
  code       text unique not null,
  created_at timestamptz not null default now()
);
alter table public.referral_codes enable row level security;
drop policy if exists referral_codes_read on public.referral_codes;
create policy referral_codes_read on public.referral_codes
  for select to authenticated using (client_id = auth.uid());

create table if not exists public.referrals (
  id           uuid primary key default gen_random_uuid(),
  referrer_id  uuid not null references public.profiles(id) on delete cascade,
  referred_id  uuid not null unique references public.profiles(id) on delete cascade,
  code         text not null,
  status       text not null default 'pending' check (status in ('pending', 'qualified')),
  qualified_at timestamptz,
  created_at   timestamptz not null default now()
);
alter table public.referrals enable row level security;
drop policy if exists referrals_read on public.referrals;
create policy referrals_read on public.referrals
  for select to authenticated
  using (referrer_id = auth.uid() or referred_id = auth.uid());

-- code court, lisible, unique
create or replace function public.gen_referral_code(p_name text)
returns text language plpgsql as $$
declare
  v_base text := upper(regexp_replace(coalesce(nullif(p_name, ''), 'PALM'), '[^a-zA-Z]', '', 'g'));
  v_code text;
begin
  v_base := left(coalesce(nullif(v_base, ''), 'PALM'), 5);
  loop
    v_code := v_base || '-' || lpad((floor(random() * 10000))::int::text, 4, '0');
    exit when not exists (select 1 from public.referral_codes where code = v_code);
  end loop;
  return v_code;
end $$;

create or replace function public.my_referral_code()
returns text language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
  v_name text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select code into v_code from public.referral_codes where client_id = v_uid;
  if v_code is null then
    select full_name into v_name from public.profiles where id = v_uid;
    v_code := public.gen_referral_code(v_name);
    insert into public.referral_codes (client_id, code) values (v_uid, v_code)
    on conflict (client_id) do update set code = public.referral_codes.code
    returning code into v_code;
  end if;
  return v_code;
end $$;
grant execute on function public.my_referral_code() to authenticated;

-- le nouvel inscrit renseigne le code de son parrain
create or replace function public.claim_referral(p_code text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_referrer uuid;
  v_created timestamptz;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select client_id into v_referrer from public.referral_codes where code = upper(btrim(p_code));
  if v_referrer is null then raise exception 'code_invalid'; end if;
  if v_referrer = v_uid then raise exception 'self_referral'; end if;

  select created_at into v_created from public.profiles where id = v_uid;
  if v_created < now() - interval '30 days' then raise exception 'account_too_old'; end if;
  if exists (select 1 from public.referrals where referred_id = v_uid) then
    raise exception 'already_referred';
  end if;

  insert into public.referrals (referrer_id, referred_id, code) values (v_referrer, v_uid, upper(btrim(p_code)));

  perform public.notify_staff('referral', 'Nouveau parrainage',
    'Un client en a parrainé un autre.', jsonb_build_object('referred_id', v_uid));
end $$;
grant execute on function public.claim_referral(text) to authenticated;

-- qualification : au 1er paiement de réservation confirmé du filleul
create or replace function public.on_payment_qualify_referral()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_ref public.referrals;
  v_set public.loyalty_settings;
begin
  if new.status <> 'paid' or new.purpose not in ('reservation', 'balance') then return new; end if;

  select * into v_ref from public.referrals
   where referred_id = new.payer_id and status = 'pending';
  if not found then return new; end if;

  select * into v_set from public.loyalty_settings where id = 1;

  update public.referrals set status = 'qualified', qualified_at = now() where id = v_ref.id;

  perform public.loyalty_post(v_ref.referrer_id, coalesce(v_set.referral_referrer_points, 500),
          'referral', v_ref.id::text, 'Parrainage validé');
  perform public.loyalty_post(v_ref.referred_id, coalesce(v_set.referral_referred_points, 300),
          'referral', v_ref.id::text, 'Bienvenue — code de parrainage');

  insert into public.notifications (user_id, type, title, body, data, channels)
  values (v_ref.referrer_id, 'referral', 'Parrainage validé',
          'Votre filleul a réservé — des points vous sont crédités.',
          jsonb_build_object('referral_id', v_ref.id), '{in_app,email,push}'::text[]);
  return new;
end $$;

drop trigger if exists trg_payment_qualify_referral on public.payments;
create trigger trg_payment_qualify_referral
  after insert or update of status on public.payments
  for each row execute function public.on_payment_qualify_referral();

-- ---------------------------------------------------------------------
-- 3. CARTES CADEAUX  (le solde devient du crédit fidélité à l'activation)
-- ---------------------------------------------------------------------
alter table public.payments drop constraint if exists payments_purpose_check;
alter table public.payments add constraint payments_purpose_check
  check (purpose = any (array['reservation', 'service_order', 'balance', 'gift_card']));

create sequence if not exists public.gift_card_ref_seq;

create table if not exists public.gift_cards (
  id             uuid primary key default gen_random_uuid(),
  code           text unique not null,
  amount         numeric not null check (amount > 0),
  balance        numeric not null,
  currency       text not null default 'XOF',
  purchaser_id   uuid references public.profiles(id) on delete set null,
  recipient_email text,
  recipient_name text,
  message        text,
  status         text not null default 'pending' check (status in ('pending', 'active', 'depleted', 'void')),
  payment_id     uuid references public.payments(id) on delete set null,
  redeemed_by    uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  activated_at   timestamptz,
  expires_at     timestamptz
);
alter table public.gift_cards enable row level security;

drop policy if exists gift_cards_read on public.gift_cards;
create policy gift_cards_read on public.gift_cards
  for select to authenticated
  using (purchaser_id = auth.uid() or redeemed_by = auth.uid() or public.auth_has_permission('payments.view'));

-- code cadeau lisible
create or replace function public.gen_gift_code()
returns text language plpgsql as $$
declare v_code text; v_alpha text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; i int;
begin
  loop
    v_code := 'GIFT-';
    for i in 1..8 loop
      v_code := v_code || substr(v_alpha, 1 + floor(random() * length(v_alpha))::int, 1);
      if i = 4 then v_code := v_code || '-'; end if;
    end loop;
    exit when not exists (select 1 from public.gift_cards where code = v_code);
  end loop;
  return v_code;
end $$;

-- achat : crée la carte (pending) + le paiement à régler
create or replace function public.create_gift_card(
  p_amount numeric, p_recipient_email text, p_recipient_name text default null, p_message text default null, p_method text default 'card'
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_card public.gift_cards;
  v_pay  public.payments;
  v_ref  text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_amount < 5000 or p_amount > 1000000 then raise exception 'bad_amount'; end if;
  if p_method not in ('mtn', 'moov', 'celtis', 'card') then raise exception 'bad_method'; end if;

  insert into public.gift_cards (code, amount, balance, purchaser_id, recipient_email, recipient_name, message, expires_at)
  values (public.gen_gift_code(), p_amount, p_amount, v_uid,
          nullif(btrim(p_recipient_email), ''), nullif(btrim(p_recipient_name), ''),
          nullif(btrim(p_message), ''), now() + interval '1 year')
  returning * into v_card;

  v_ref := 'PAY-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.payment_ref_seq')::text, 6, '0');
  insert into public.payments (internal_ref, provider, purpose, payer_id, method, amount, status)
  values (v_ref, 'sim', 'gift_card', v_uid, p_method, p_amount, 'pending')
  returning * into v_pay;

  update public.gift_cards set payment_id = v_pay.id where id = v_card.id;

  return jsonb_build_object('card_id', v_card.id, 'code', v_card.code, 'payment_ref', v_pay.internal_ref);
end $$;
grant execute on function public.create_gift_card(numeric, text, text, text, text) to authenticated;

-- activation quand le paiement 'gift_card' passe à 'paid'
create or replace function public.on_gift_payment_activate()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_card public.gift_cards;
begin
  if new.status <> 'paid' or new.purpose <> 'gift_card' then return new; end if;
  select * into v_card from public.gift_cards where payment_id = new.id and status = 'pending';
  if not found then return new; end if;

  update public.gift_cards set status = 'active', activated_at = now() where id = v_card.id;

  if v_card.recipient_email is not null then
    -- notifier l'acheteur (l'e-mail au destinataire est géré par l'app si besoin)
    insert into public.notifications (user_id, type, title, body, data, channels)
    values (v_card.purchaser_id, 'gift_card', 'Carte cadeau activée',
            'Votre carte cadeau ' || v_card.code || ' est prête à être offerte.',
            jsonb_build_object('gift_card_id', v_card.id), '{in_app,email}'::text[]);
  end if;
  return new;
end $$;

drop trigger if exists trg_gift_payment_activate on public.payments;
create trigger trg_gift_payment_activate
  after insert or update of status on public.payments
  for each row execute function public.on_gift_payment_activate();

-- utilisation : le solde de la carte devient du crédit fidélité
create or replace function public.redeem_gift_card(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_card public.gift_cards;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
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
grant execute on function public.redeem_gift_card(text) to authenticated;
