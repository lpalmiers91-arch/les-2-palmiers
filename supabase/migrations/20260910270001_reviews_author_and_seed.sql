-- =====================================================================
--  Avis : nom d'auteur explicite (pour avis importés / de démonstration),
--  et jeu d'avis publiés pour que la section « Avis » du site ne soit
--  pas vide. Les avis réels laissent author_name à NULL (le nom vient
--  alors du profil).
-- =====================================================================

alter table public.reviews add column if not exists author_name text;

do $$
declare
  v_client uuid;
  v_apt_a  uuid;
  v_apt_b  uuid;
begin
  select id into v_client from auth.users where email = 'client@les2palmiers.site';
  select id into v_apt_a from public.apartments where slug = 'les-2-palmiers';
  select id into v_apt_b from public.apartments where slug = 'atelier-fidjrosse';
  if v_client is null then return; end if;

  -- on ne recrée pas si des avis publiés existent déjà
  if exists (select 1 from public.reviews where status = 'published') then return; end if;

  insert into public.reviews (client_id, apartment_id, author_name, rating, title, body, status, featured, staff_reply, created_at)
  values
    (v_client, v_apt_a, 'Aïcha D.', 5, 'Un séjour sans une seule contrariété',
     'Tout était prêt à l''arrivée, la terrasse est encore plus belle que sur les photos. L''équipe a organisé la voiture et un dîner en deux messages. On reviendra.',
     'published', true, 'Merci Aïcha, au plaisir de vous accueillir de nouveau.', now() - interval '9 days'),
    (v_client, v_apt_a, 'Thomas R.', 5, 'Idéal pour un déplacement pro',
     'Wi-Fi fibre impeccable, quartier calme, et le petit-déjeuner déposé chaque matin. Le contrat et la facture se règlent en ligne, rien à imprimer.',
     'published', false, null, now() - interval '17 days'),
    (v_client, v_apt_b, 'Fatou & Karim', 4, 'Le loft de Fidjrossè, à deux pas de la plage',
     'Superbe volume, la verrière est magnifique le matin. Un poil chaud en début d''après-midi mais la clim fait le travail. Rooftop parfait pour l''apéro.',
     'published', false, 'Merci pour ce retour, nous avons ajouté un ventilateur sur pied dans la mezzanine.', now() - interval '28 days'),
    (v_client, v_apt_a, 'Nadège K.', 5, 'La conciergerie change tout',
     'On a testé le cuisinier privé un soir, puis une sortie à Ouidah avec chauffeur. Tout est passé par la messagerie, sans mauvaise surprise sur les prix.',
     'published', false, null, now() - interval '35 days'),
    (v_client, v_apt_b, 'Owen M.', 4, 'Très bon rapport qualité-prix',
     'Loft propre, bien équipé, arrivée fluide. J''aurais aimé un peu plus de rangements, sinon rien à redire.',
     'published', false, null, now() - interval '44 days');
end $$;
