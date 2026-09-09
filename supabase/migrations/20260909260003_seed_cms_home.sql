-- Seed : la page d'accueil devient éditable (blocs). Contenu par défaut = FR actuel.

insert into public.site_pages (slug, title, status, is_system, in_nav, nav_order)
values ('home', 'Accueil', 'published', true, false, 0)
on conflict (slug) do nothing;

do $$
declare v_page uuid;
begin
  select id into v_page from public.site_pages where slug = 'home';
  if exists (select 1 from public.site_blocks where page_id = v_page) then return; end if;

  insert into public.site_blocks (page_id, type, position, content) values
  (v_page, 'hero', 0, jsonb_build_object(
    'eyebrow','Appartement meublé & conciergerie — Cotonou',
    'titleA','Profitez pleinement',
    'titleB','de votre temps.',
    'titleEm','Nous nous occupons du reste.',
    'lede','Un appartement d''exception, et une équipe qui apporte à votre porte tout ce dont un séjour a besoin : une voiture, un dîner, le ménage, un massage, la découverte du pays.',
    'image','terrace-palms.jpg',
    'stats', jsonb_build_array(
      jsonb_build_object('value','4','label','voyageurs'),
      jsonb_build_object('value','2','label','chambres'),
      jsonb_build_object('value','10','label','services à domicile'),
      jsonb_build_object('value','7 j / 7','label','à vos côtés'))
  )),
  (v_page, 'concierge', 1, jsonb_build_object(
    'title','Une seule équipe.',
    'titleEm','Tout ce qu''un séjour demande.',
    'lede','Vous ne cherchez pas un chauffeur, un traiteur ou une nounou dans une ville que vous ne connaissez pas. Vous le demandez, une fois. Le reste se passe à la porte de l''appartement.',
    'caption','Une journée type, orchestrée par Les 2 Palmiers.',
    'ledger', jsonb_build_array(
      jsonb_build_object('t','07:30','s','Petit-déjeuner déposé','d','café, pain, fruits de saison'),
      jsonb_build_object('t','09:00','s','Ménage complet','d','chambres, cuisine, terrasse'),
      jsonb_build_object('t','10:15','s','Voiture avec chauffeur','d','journée à Ouidah'),
      jsonb_build_object('t','13:00','s','Coiffure à domicile','d','tresses, deux personnes'),
      jsonb_build_object('t','16:30','s','Recharge & transaction','d','MTN, transfert reçu'),
      jsonb_build_object('t','19:00','s','Cuisinier privé','d','dîner ouest-africain, pour 4'),
      jsonb_build_object('t','21:30','s','Massage relaxant','d','60 min, sur place'))
  )),
  (v_page, 'apartment', 2, jsonb_build_object(
    'title','L''appartement,',
    'titleEm','au calme, en hauteur.',
    'lede','Deux chambres, deux salles d''eau, un séjour ouvert et une terrasse à colonnes qui donne sur les toits et l''océan. Tout est prêt : vous posez vos valises, rien d''autre.',
    'whatsThere','Ce qui est là',
    'goodToKnow','Bon à savoir',
    'facts', jsonb_build_array(
      jsonb_build_object('k','Arrivée','v','à partir de 14 h 00'),
      jsonb_build_object('k','Départ','v','avant 11 h 00'),
      jsonb_build_object('k','Capacité','v','4 voyageurs'),
      jsonb_build_object('k','Annulation','v','modérée, gratuite jusqu''à quelques jours avant'))
  )),
  (v_page, 'services', 3, jsonb_build_object(
    'title','Dix façons de vous',
    'titleEm','simplifier le séjour.',
    'lede','Réservez un service au moment de la réservation, ou plus tard depuis votre espace. Prix fixe quand c''est possible, devis clair sinon.')
  ),
  (v_page, 'tourism', 4, jsonb_build_object(
    'title','Séjournez ici,',
    'titleEm','explorez tout autour.',
    'lede','La côte, les palais royaux, les lagunes, les collines. On organise la voiture, le chauffeur et le programme — vous n''avez qu''à regarder par la fenêtre.',
    'places', jsonb_build_array(
      jsonb_build_object('name','Ouidah','when','sur la côte','note','La route de l''esclave, le temple des pythons, la forêt sacrée de Kpassè.'),
      jsonb_build_object('name','Abomey','when','à l''intérieur','note','Les palais royaux du Dahomey, classés au patrimoine mondial de l''UNESCO.'),
      jsonb_build_object('name','Lac Noir','when','excursion','note','Des eaux paisibles bordées de végétation, en barque, à l''écart de la ville.'),
      jsonb_build_object('name','Agouland','when','excursion','note','Une nature préservée, pour une journée au vert loin de l''agitation.'),
      jsonb_build_object('name','Kpalimé','when','vers le Togo','note','Des collines verdoyantes, des cascades et des plantations, côté frontière.'),
      jsonb_build_object('name','Lomé','when','vers le Togo','note','La capitale togolaise, son grand marché et sa longue corniche en bord de mer.'))
  )),
  (v_page, 'reviews', 5, jsonb_build_object(
    'title','Ils ont séjourné ici.',
    'lede','Les retours de nos clients, après leur passage.')
  ),
  (v_page, 'closing', 6, jsonb_build_object(
    'quote','Profitez pleinement de votre temps… nous nous occupons du reste.',
    'ctaLabel','Réserver l''appartement',
    'contact','Une question avant de réserver ? Écrivez à')
  );
end $$;
