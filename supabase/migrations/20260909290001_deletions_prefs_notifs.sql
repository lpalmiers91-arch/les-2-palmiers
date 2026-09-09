-- =====================================================================
--  Suppressions (messages, appartements, infos séjour) + préférences de
--  notification + couverture temps réel des évènements.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Suppression douce des messages ("supprimé par X")
-- ---------------------------------------------------------------------
alter table public.messages
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references public.profiles(id) on delete set null;

create or replace function public.delete_message(p_message uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_msg public.messages;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_msg from public.messages where id = p_message;
  if not found then raise exception 'message_not_found'; end if;
  -- l'auteur, ou un membre de l'équipe pouvant traiter la messagerie
  if v_msg.sender_id <> v_uid and not public.has_permission(v_uid, 'messages.handle') then
    raise exception 'forbidden';
  end if;
  update public.messages
    set deleted_at = now(), deleted_by = v_uid,
        body = '', attachments = '[]'::jsonb
    where id = p_message;
end $$;

grant execute on function public.delete_message(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 2. Suppression complète d'un appartement
-- ---------------------------------------------------------------------
create or replace function public.delete_apartment(p_apartment uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_live int;
begin
  if not public.has_permission(v_uid, 'apartments.edit') then
    raise exception 'forbidden';
  end if;

  select count(*) into v_live
  from public.reservations
  where apartment_id = p_apartment
    and status in ('pending_payment', 'confirmed', 'in_stay');
  if v_live > 0 then
    raise exception 'has_live_reservations';
  end if;

  -- réservations closes -> on retire (contrats/évènements en cascade, paiements -> set null)
  delete from public.reservations where apartment_id = p_apartment;
  -- le reste (media, amenities, price_rules, availability_blocks, stay_info) part en cascade
  delete from public.apartments where id = p_apartment;
end $$;

grant execute on function public.delete_apartment(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 3. Suppression d'une fiche infos séjour
-- ---------------------------------------------------------------------
create or replace function public.delete_stay_info(p_apartment uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_permission(auth.uid(), 'stay.edit') then
    raise exception 'forbidden';
  end if;
  delete from public.stay_info where apartment_id = p_apartment;
end $$;

grant execute on function public.delete_stay_info(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- 4. Préférences de notification par utilisateur
--    Stockées dans profiles.preferences->'notif' = {"email":bool,"push":bool}
--    (in-app toujours actif). notify() les respecte.
-- ---------------------------------------------------------------------
create or replace function public.set_notification_prefs(p_email boolean, p_push boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
    set preferences = jsonb_set(
      coalesce(preferences, '{}'::jsonb),
      '{notif}',
      jsonb_build_object('email', coalesce(p_email, true), 'push', coalesce(p_push, true)),
      true
    )
    where id = auth.uid();
end $$;

grant execute on function public.set_notification_prefs(boolean, boolean) to authenticated;

-- ---------------------------------------------------------------------
-- 5. Couverture temps réel : notifier à chaque évènement clé
-- ---------------------------------------------------------------------

-- 5a. Nouvel inscrit -> prévenir l'équipe
create or replace function public.on_new_profile_notify()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.notify_staff(
    'client',
    'Nouveau client',
    coalesce(new.full_name, 'Un client') || ' vient de créer un compte.',
    jsonb_build_object('client_id', new.id)
  );
  return new;
end $$;

drop trigger if exists trg_profiles_new_notify on public.profiles;
create trigger trg_profiles_new_notify
  after insert on public.profiles
  for each row execute function public.on_new_profile_notify();

-- 5b. Réservation confirmée -> prévenir l'équipe + le client
create or replace function public.on_reservation_status_notify()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    if new.status = 'confirmed' then
      perform public.notify_staff('reservation', 'Réservation confirmée',
        'Réf. ' || new.reference,
        jsonb_build_object('reservation_id', new.id));
      insert into public.notifications (user_id, type, title, body, data)
      values (new.guest_id, 'reservation', 'Votre réservation est confirmée',
              'Réf. ' || new.reference || ' — nous préparons votre séjour.',
              jsonb_build_object('reservation_id', new.id));
    elsif new.status = 'cancelled' then
      insert into public.notifications (user_id, type, title, body, data)
      values (new.guest_id, 'reservation', 'Réservation annulée',
              'Réf. ' || new.reference,
              jsonb_build_object('reservation_id', new.id));
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_reservation_status_notify on public.reservations;
create trigger trg_reservation_status_notify
  after update on public.reservations
  for each row execute function public.on_reservation_status_notify();

-- 5c. Nouvelle demande de service -> prévenir l'équipe
create or replace function public.on_service_order_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_title text;
begin
  select title into v_title from public.services where id = new.service_id;
  perform public.notify_staff('service_order', 'Nouvelle demande de service',
    coalesce(v_title, 'Service') || ' — réf. ' || new.reference,
    jsonb_build_object('service_order_id', new.id, 'customer_id', new.customer_id));
  return new;
end $$;

drop trigger if exists trg_service_order_notify on public.service_orders;
create trigger trg_service_order_notify
  after insert on public.service_orders
  for each row execute function public.on_service_order_notify();

-- 5d. Changement de statut d'une demande -> prévenir le client
create or replace function public.on_service_order_status_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_msg text;
begin
  if new.status is distinct from old.status then
    v_msg := case new.status
      when 'accepted'    then 'Votre demande a été acceptée.'
      when 'scheduled'   then 'Votre prestation est planifiée.'
      when 'in_progress' then 'Votre prestation a démarré.'
      when 'completed'   then 'Votre prestation est terminée.'
      when 'declined'    then 'Votre demande n''a pas pu être acceptée.'
      else null end;
    if v_msg is not null then
      insert into public.notifications (user_id, type, title, body, data)
      values (new.customer_id, 'service_order', 'Mise à jour de votre demande', v_msg,
              jsonb_build_object('service_order_id', new.id));
    end if;
  end if;
  return new;
end $$;

drop trigger if exists trg_service_order_status_notify on public.service_orders;
create trigger trg_service_order_status_notify
  after update on public.service_orders
  for each row execute function public.on_service_order_status_notify();
