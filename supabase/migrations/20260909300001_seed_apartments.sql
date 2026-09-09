-- =====================================================================
--  Amorçage multi-appartements : enregistre les photos/équipements de
--  l'appartement principal + ajoute un second logement publié.
-- =====================================================================

-- ---------- Appartement 1 : photos + équipements ----------
do $$
declare v_apt uuid;
begin
  select id into v_apt from public.apartments where slug = 'les-2-palmiers';
  if v_apt is null then return; end if;

  update public.apartments set
    summary = 'Deux chambres, terrasse à colonnes et vue sur les toits et l''océan, au calme et en hauteur à Cotonou.',
    description = E'Un appartement meublé d''exception au dernier étage : séjour ouvert, cuisine complète, deux chambres avec salle d''eau, et une longue terrasse à balustrade qui donne sur les palmiers et l''océan.\n\nTout est prêt à l''arrivée — linge, produits, eau, groupe électrogène. Notre équipe reste joignable 7 j/7 pour la voiture, le ménage, un cuisinier ou une sortie.',
    capacity = 4, bedrooms = 2, bathrooms = 2, base_price = 45000, cleaning_fee = 15000
  where id = v_apt;

  delete from public.apartment_media where apartment_id = v_apt;
  insert into public.apartment_media (apartment_id, type, storage_path, alt, position, is_cover) values
    (v_apt, 'photo', 'balcony-view.jpg', 'Terrasse à balustrade avec palmier en pot et vue sur l''océan', 0, true),
    (v_apt, 'photo', 'rooftop-ocean.jpg', 'Vue depuis la terrasse : toits de Cotonou et océan', 1, false),
    (v_apt, 'photo', 'g-08.jpg', 'Façade en terre cuite, balcons à balustrade', 2, false),
    (v_apt, 'photo', 'g-27.jpg', 'Chambre avec tête de lit capitonnée', 3, false),
    (v_apt, 'photo', 'g-14.jpg', 'Cuisine équipée, plan de travail clair', 4, false),
    (v_apt, 'photo', 'g-20.jpg', 'Terrasse ombragée, palmier et bougainvilliers', 5, false),
    (v_apt, 'photo', 'g-03.jpg', 'Séjour ouvert et lumineux', 6, false),
    (v_apt, 'photo', 'g-05.jpg', 'Salle d''eau carrelée', 7, false),
    (v_apt, 'photo', 'g-11.jpg', 'Coin repas près des baies vitrées', 8, false),
    (v_apt, 'photo', 'g-16.jpg', 'Seconde chambre', 9, false);

  delete from public.apartment_amenities where apartment_id = v_apt;
  insert into public.apartment_amenities (apartment_id, amenity_key, detail, position) values
    (v_apt, 'wifi', 'Fibre, débit télétravail', 0),
    (v_apt, 'parking', 'Place privée sécurisée', 1),
    (v_apt, 'kitchen', 'Four, plaque, frigo, cafetière', 2),
    (v_apt, 'ac', 'Climatisation dans chaque pièce', 3),
    (v_apt, 'terrace', 'Terrasse à colonnes vue océan', 4),
    (v_apt, 'power', 'Groupe électrogène + réserve d''eau', 5),
    (v_apt, 'security', 'Gardiennage 24 h/24', 6);
end $$;

-- ---------- Appartement 2 : nouveau logement publié ----------
do $$
declare v_apt uuid;
begin
  select id into v_apt from public.apartments where slug = 'atelier-fidjrosse';
  if v_apt is null then
    insert into public.apartments (slug, name, status, summary, description,
      address, capacity, bedrooms, bathrooms, base_price, cleaning_fee,
      checkin_from, checkout_before, cancellation_policy)
    values (
      'atelier-fidjrosse', 'L''Atelier — Fidjrossè', 'published',
      'Un loft lumineux à deux pas de la plage de Fidjrossè : mezzanine, grande verrière et rooftop privatif.',
      E'Ancien atelier converti en loft : double hauteur sous plafond, verrière plein sud, une chambre en mezzanine et un rooftop privatif pour les fins de journée.\n\nParfait pour un couple ou un voyageur d''affaires qui veut la plage et le centre à quelques minutes. Même équipe, mêmes services à la demande.',
      'Fidjrossè, Cotonou', 3, 1, 1, 38000, 12000,
      '15:00', '11:00', 'moderate'
    )
    returning id into v_apt;
  end if;

  delete from public.apartment_media where apartment_id = v_apt;
  insert into public.apartment_media (apartment_id, type, storage_path, alt, position, is_cover) values
    (v_apt, 'photo', 'g-22.jpg', 'Loft à double hauteur avec verrière', 0, true),
    (v_apt, 'photo', 'g-24.jpg', 'Mezzanine chambre', 1, false),
    (v_apt, 'photo', 'g-19.jpg', 'Rooftop privatif au coucher du soleil', 2, false),
    (v_apt, 'photo', 'g-13.jpg', 'Cuisine ouverte sur le séjour', 3, false),
    (v_apt, 'photo', 'g-30.jpg', 'Salle d''eau contemporaine', 4, false),
    (v_apt, 'photo', 'g-17.jpg', 'Coin bureau près de la verrière', 5, false),
    (v_apt, 'photo', 'g-25.jpg', 'Détail décoration', 6, false);

  delete from public.apartment_amenities where apartment_id = v_apt;
  insert into public.apartment_amenities (apartment_id, amenity_key, detail, position) values
    (v_apt, 'wifi', 'Fibre', 0),
    (v_apt, 'kitchen', 'Cuisine ouverte équipée', 1),
    (v_apt, 'ac', 'Climatisation réversible', 2),
    (v_apt, 'terrace', 'Rooftop privatif', 3),
    (v_apt, 'beach', 'Plage de Fidjrossè à 400 m', 4),
    (v_apt, 'power', 'Onduleur + eau de secours', 5);
end $$;
