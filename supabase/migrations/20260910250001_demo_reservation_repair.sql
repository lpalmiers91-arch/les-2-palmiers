-- =====================================================================
--  Cohérence des réservations de démonstration du compte client@ :
--   - L2P-2026-00003 : séjour EN COURS (dates autour d'aujourd'hui)
--   - L2P-2026-00008 : séjour CONFIRMÉ à venir (annulation / changement de dates)
--  Idempotent, tolérant : chaque mise à jour est tentée dans son propre bloc ;
--  si une fenêtre est occupée on décale, sinon on laisse tel quel.
-- =====================================================================
do $$
declare
  v_client uuid;
  v_apt3   uuid;
  v_apt8   uuid;
  v_from   date;
begin
  select id into v_client from auth.users where email = 'client@les2palmiers.site';
  if v_client is null then return; end if;

  select apartment_id into v_apt3 from public.reservations
   where guest_id = v_client and reference = 'L2P-2026-00003';
  select apartment_id into v_apt8 from public.reservations
   where guest_id = v_client and reference = 'L2P-2026-00008';

  -- 00003 -> séjour en cours (fenêtre autour d'aujourd'hui, si libre)
  if v_apt3 is not null and not exists (
    select 1 from public.reservations
     where apartment_id = v_apt3
       and reference <> 'L2P-2026-00003'
       and status in ('pending_payment','confirmed','in_stay')
       and date_range && daterange(current_date - 2, current_date + 3)
  ) then
    begin
      update public.reservations
         set date_range = daterange(current_date - 2, current_date + 3), status = 'in_stay'
       where guest_id = v_client and reference = 'L2P-2026-00003' and status <> 'cancelled';
    exception when others then null;
    end;
  end if;

  -- 00008 -> confirmé à venir : première fenêtre de 5 nuits libre à partir de J+20
  for v_from in
    select (current_date + n)::date from generate_series(20, 120, 5) n
  loop
    if not exists (
      select 1 from public.reservations
       where apartment_id = v_apt8
         and reference <> 'L2P-2026-00008'
         and status in ('pending_payment','confirmed','in_stay')
         and date_range && daterange(v_from, v_from + 5)
    ) then
      begin
        update public.reservations
           set date_range = daterange(v_from, v_from + 5), status = 'confirmed'
         where guest_id = v_client and reference = 'L2P-2026-00008' and status <> 'cancelled';
        exit;
      exception when others then null;
      end;
    end if;
  end loop;
end $$;
