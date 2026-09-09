-- =====================================================================
--  Amorçage : comptes de fidélité pour les clients déjà inscrits +
--  fiche "infos séjour" de départ (le staff l'édite ensuite).
-- =====================================================================

-- 1. bonus d'inscription pour les clients existants (sans double comptage)
do $$
declare r record;
begin
  for r in
    select p.id
    from public.profiles p
    where not exists (
      select 1 from public.user_roles ur
      where ur.user_id = p.id and ur.role_id in ('admin','staff','coordinator')
    )
  loop
    perform public.loyalty_award(r.id, 'signup', r.id::text);
  end loop;
end $$;

-- 2. fiche séjour de départ pour l'appartement principal
insert into public.stay_info (
  apartment_id, wifi_ssid, wifi_password, house_manual,
  checkin_notes, checkout_notes, emergency_contact, extras
)
select
  a.id,
  'Les2Palmiers',
  'Palmiers2026',
  E'Bienvenue aux 2 Palmiers.\n\nLa climatisation se règle avec la télécommande blanche — mode "Cool", 24 °C conseillé.\nLe chauffe-eau est déjà en marche ; comptez 15 min pour l''eau chaude.\nLe tri se fait dans la cuisine : bac vert (verre), sac noir (reste).\nMerci de retirer vos chaussures à l''entrée.',
  E'Arrivée à partir de 15 h. Un membre de l''équipe vous accueille et vous remet les clés.\nUne pièce d''identité vous sera demandée pour la fiche de police.',
  E'Départ avant 11 h. Laissez les clés sur la table de l''entrée et fermez simplement la porte.\nUn état des lieux rapide est fait dans la journée.',
  '+229 01 67 00 00 00',
  '{"parking": "Place réservée dans la cour, portail télécommandé", "menage": "Ménage de mi-séjour offert au-delà de 4 nuits"}'::jsonb
from public.apartments a
where a.name ilike 'Les 2 Palmiers%'
on conflict (apartment_id) do nothing;
