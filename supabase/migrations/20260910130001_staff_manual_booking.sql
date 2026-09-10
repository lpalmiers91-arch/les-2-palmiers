-- =====================================================================
--  Réservation manuelle par l'équipe (client qui réserve par téléphone,
--  WhatsApp, sur place…). Le profil invité est créé côté Edge Function
--  (admin API) ; ici on pose la réservation et, si demandé, le paiement.
-- =====================================================================

-- paiements encaissés hors ligne (espèces, mobile money reçu à la main…)
alter table public.payments drop constraint if exists payments_method_check;
alter table public.payments add constraint payments_method_check
  check (method = any (array['mtn', 'moov', 'celtis', 'card', 'cash', 'bank_transfer']));

alter table public.payments drop constraint if exists payments_channel_check;
alter table public.payments add constraint payments_channel_check
  check (channel = any (array['online', 'proof', 'offline']));

create or replace function public.staff_place_booking(
  p_apartment uuid,
  p_range daterange,
  p_guest_id uuid,
  p_guests int default 2,
  p_channel text default 'phone',
  p_mark_paid text default 'none',   -- 'none' | 'deposit' | 'full'
  p_note text default null
) returns public.reservations
language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_quote jsonb;
  v_stay  numeric;
  v_ref   text;
  v_res   public.reservations;
  v_dep   numeric;
  v_pay   numeric := 0;
begin
  if not (public.auth_has_permission('reservations.update') or public.is_staff(v_uid)) then
    raise exception 'forbidden';
  end if;
  if p_guest_id is null then raise exception 'guest_required'; end if;
  if p_channel not in ('phone', 'email', 'whatsapp', 'walk_in', 'other') then
    raise exception 'bad_channel';
  end if;

  perform pg_advisory_xact_lock(hashtext(p_apartment::text));
  v_quote := public.quote_stay(p_apartment, p_range, p_guests);
  if not (v_quote->>'available')::boolean then raise exception 'dates_unavailable'; end if;
  if (v_quote->>'over_capacity')::boolean then raise exception 'over_capacity'; end if;

  v_stay := (v_quote->>'total')::numeric;
  v_dep  := round(v_stay * 0.5);

  v_ref := 'L2P-' || to_char(now(), 'YYYY') || '-' ||
           lpad(nextval('public.reservation_ref_seq')::text, 5, '0');

  insert into public.reservations (
    reference, apartment_id, guest_id, date_range, guests_count,
    nightly_price, fees, discount_amount, total_amount, deposit_amount, currency, status, source
  ) values (
    v_ref, p_apartment, p_guest_id, p_range, p_guests,
    round((v_quote->>'lodging_subtotal')::numeric / nullif((v_quote->>'nights')::numeric, 0)),
    jsonb_build_object('cleaning_fee', (v_quote->>'cleaning_fee')::numeric, 'services_prepaid', 0),
    (v_quote->>'discount_amount')::numeric,
    v_stay, v_dep, 'XOF',
    case when p_mark_paid = 'none' then 'pending_payment' else 'confirmed' end,
    'staff'
  ) returning * into v_res;

  insert into public.reservation_events (reservation_id, type, payload, actor_id)
  values (v_res.id, 'created',
          jsonb_build_object('quote', v_quote, 'manual', true, 'channel', p_channel, 'note', p_note),
          v_uid);

  if p_mark_paid = 'deposit' then v_pay := v_dep;
  elsif p_mark_paid = 'full' then v_pay := v_stay;
  end if;

  if v_pay > 0 then
    insert into public.payments (
      internal_ref, provider, reservation_id, payer_id, purpose, method, channel,
      amount, currency, status, paid_at, proof_note
    ) values (
      'PAY-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(nextval('public.payment_ref_seq')::text, 6, '0'),
      'sim', v_res.id, p_guest_id, 'reservation', 'cash', 'offline',
      v_pay, 'XOF', 'paid', now(),
      coalesce('Encaissé par l''équipe · ' || p_note, 'Encaissé par l''équipe')
    );
    update public.reservations set amount_paid = v_pay where id = v_res.id;
  end if;

  -- notifie le client (si le compte est actif)
  insert into public.notifications (user_id, type, title, body, data, channels)
  values (p_guest_id, 'reservation',
          'Réservation enregistrée',
          'Votre séjour ' || v_ref || ' est enregistré par l''équipe des 2 Palmiers.',
          jsonb_build_object('reservation_id', v_res.id),
          '{in_app,email}'::text[]);

  return v_res;
end $$;

grant execute on function public.staff_place_booking(uuid, daterange, uuid, int, text, text, text) to authenticated;
