-- Les 2 Palmiers — données du catalogue : catégories, services, destinations (Phase 3)
-- Contenu de référence (repris de docs/REFERENCE-VITRINE.md). Idempotent.
-- L'appartement lui-même et ses médias sont dans supabase/seed.sql (données de démo).

-- =====================================================================
--  Catégories de services
-- =====================================================================
insert into public.service_categories (slug, label, position) values
  ('maison-entretien', 'Maison & entretien', 1),
  ('beaute-bien-etre', 'Beauté & bien-être', 2),
  ('restauration',     'Restauration',       3),
  ('mobilite',         'Mobilité',           4),
  ('famille',          'Famille',            5),
  ('vie-pratique',     'Vie pratique',       6),
  ('sur-mesure',       'Sur mesure',         7)
on conflict (slug) do update set label = excluded.label, position = excluded.position;

-- =====================================================================
--  Services (10) — slugs alignés avec la vitrine
-- =====================================================================
insert into public.services (slug, category_id, title, description, pricing_mode, base_price, unit, lead_time_hours, icon, position, options_schema)
values
  ('location-voiture',
   (select id from public.service_categories where slug = 'mobilite'),
   'Location de voiture',
   'Des véhicules modernes, propres et confortables, pour tous vos déplacements.',
   'quote', null, 'jour', 24, 'car', 1,
   '[{"name":"duree_jours","label":"Nombre de jours","type":"number","required":true},
     {"name":"avec_chauffeur","label":"Avec chauffeur","type":"select","required":true,"options":["Oui","Non"]},
     {"name":"date_debut","label":"Date de début","type":"date","required":true}]'::jsonb),

  ('entretien',
   (select id from public.service_categories where slug = 'maison-entretien'),
   'Agents d''entretien',
   'Des professionnels qualifiés pour la propreté, l''ordre et la sécurité de votre appartement.',
   'fixed', 15000, 'prestation', 12, 'spray', 2,
   '[{"name":"type","label":"Type d''intervention","type":"select","required":true,"options":["Ménage standard","Grand ménage","Repassage"]},
     {"name":"creneau","label":"Créneau souhaité","type":"time","required":true}]'::jsonb),

  ('coiffure-tresses',
   (select id from public.service_categories where slug = 'beaute-bien-etre'),
   'Coiffure & tresses',
   'Des coiffeurs et coiffeuses professionnels se déplacent chez vous, à domicile.',
   'quote', null, 'prestation', 24, 'scissors', 3,
   '[{"name":"prestation","label":"Prestation","type":"text","required":true},
     {"name":"nb_personnes","label":"Nombre de personnes","type":"number","required":true}]'::jsonb),

  ('cuisinier',
   (select id from public.service_categories where slug = 'restauration'),
   'Cuisinier à domicile',
   'Des plats faits maison, préparés selon vos goûts et vos préférences.',
   'quote', null, 'prestation', 24, 'chef', 4,
   '[{"name":"nb_personnes","label":"Nombre de convives","type":"number","required":true},
     {"name":"repas","label":"Repas","type":"select","required":true,"options":["Petit-déjeuner","Déjeuner","Dîner"]},
     {"name":"preferences","label":"Préférences / allergies","type":"textarea","required":false}]'::jsonb),

  ('pedicure-manucure',
   (select id from public.service_categories where slug = 'beaute-bien-etre'),
   'Pédicure & manucure',
   'Soins professionnels pour des mains et des pieds impeccables.',
   'fixed', 10000, 'prestation', 24, 'hand', 5,
   '[{"name":"soin","label":"Soin","type":"select","required":true,"options":["Manucure","Pédicure","Les deux"]},
     {"name":"creneau","label":"Créneau souhaité","type":"time","required":true}]'::jsonb),

  ('massage',
   (select id from public.service_categories where slug = 'beaute-bien-etre'),
   'Massage à domicile',
   'Des mains expertes pour votre bien-être et votre relaxation.',
   'fixed', 15000, 'prestation', 24, 'waves', 6,
   '[{"name":"type","label":"Type de massage","type":"select","required":true,"options":["Relaxant","Sportif","Deep tissue"]},
     {"name":"duree_min","label":"Durée (minutes)","type":"select","required":true,"options":["45","60","90"]}]'::jsonb),

  ('recharge-transactions',
   (select id from public.service_categories where slug = 'vie-pratique'),
   'Recharge & transactions',
   'Recharge MTN, Moov et Celtis, ainsi que des transactions rapides.',
   'metered', null, 'prestation', 1, 'wallet', 7,
   '[{"name":"operateur","label":"Opérateur","type":"select","required":true,"options":["MTN","Moov","Celtis"]},
     {"name":"montant","label":"Montant (XOF)","type":"number","required":true}]'::jsonb),

  ('couture',
   (select id from public.service_categories where slug = 'maison-entretien'),
   'Couture à domicile',
   'Des tailleurs professionnels à votre service, où que vous soyez.',
   'quote', null, 'prestation', 48, 'shirt', 8,
   '[{"name":"besoin","label":"Besoin","type":"select","required":true,"options":["Retouche","Confection","Réparation"]},
     {"name":"details","label":"Détails","type":"textarea","required":false}]'::jsonb),

  ('garde-enfants',
   (select id from public.service_categories where slug = 'famille'),
   'Garde d''enfants',
   'Des nounous professionnelles, fiables et disponibles 24h/24.',
   'metered', null, 'heure', 12, 'baby', 9,
   '[{"name":"nb_enfants","label":"Nombre d''enfants","type":"number","required":true},
     {"name":"ages","label":"Âges","type":"text","required":true},
     {"name":"date_debut","label":"Début","type":"date","required":true},
     {"name":"duree_heures","label":"Durée estimée (heures)","type":"number","required":true}]'::jsonb),

  ('sur-mesure',
   (select id from public.service_categories where slug = 'sur-mesure'),
   'Sur mesure',
   'Un besoin particulier ? Nous adaptons nos services à votre demande.',
   'quote', null, 'prestation', 24, 'sparkles', 10,
   '[{"name":"demande","label":"Décrivez votre besoin","type":"textarea","required":true}]'::jsonb)
on conflict (slug) do update set
  category_id    = excluded.category_id,
  title          = excluded.title,
  description    = excluded.description,
  pricing_mode   = excluded.pricing_mode,
  base_price     = excluded.base_price,
  unit           = excluded.unit,
  lead_time_hours = excluded.lead_time_hours,
  icon           = excluded.icon,
  position       = excluded.position,
  options_schema = excluded.options_schema;

-- =====================================================================
--  Destinations touristiques
-- =====================================================================
insert into public.destinations (name, tag, position) values
  ('Ouidah',   'Mémoire & patrimoine',   1),
  ('Abomey',   'Palais royaux',          2),
  ('Lac Noir', 'Eaux paisibles',         3),
  ('Agouland', 'Nature préservée',       4),
  ('Kpalimé',  'Collines verdoyantes',   5),
  ('Lomé',     'Vie côtière',            6)
on conflict (name) do update set tag = excluded.tag, position = excluded.position;
