-- =====================================================================
--  Remise en cohérence de l'état de démonstration :
--   - L2P-2026-00003 : séjour en cours (dates autour d'aujourd'hui)
--   - L2P-2026-00008 : séjour confirmé à venir, contrat ENVOYÉ (à signer)
-- =====================================================================
do $$
declare
  v_client uuid;
  v_apt    uuid;
  v_from   date;
  v_res    uuid;
begin
  select id into v_client from auth.users where email = 'client@les2palmiers.site';
  if v_client is null then return; end if;

  update public.reservations
     set date_range = daterange(current_date - 2, current_date + 3), status = 'in_stay'
   where guest_id = v_client and reference = 'L2P-2026-00003' and status <> 'cancelled';

  select apartment_id, id into v_apt, v_res from public.reservations
   where guest_id = v_client and reference = 'L2P-2026-00008';

  if v_apt is not null then
    for v_from in select (current_date + n)::date from generate_series(20, 120, 5) n loop
      if not exists (
        select 1 from public.reservations
         where apartment_id = v_apt and reference <> 'L2P-2026-00008'
           and status in ('pending_payment','confirmed','in_stay')
           and date_range && daterange(v_from, v_from + 5)
      ) then
        begin
          update public.reservations
             set date_range = daterange(v_from, v_from + 5), status = 'confirmed'
           where id = v_res;
          exit;
        exception when others then null;
        end;
      end if;
    end loop;

    -- contrat de cette réservation : passé à « envoyé » pour la démo
    update public.contracts
       set status = 'sent', sent_at = now()
     where reservation_id = v_res and status = 'draft';
  end if;
end $$;
