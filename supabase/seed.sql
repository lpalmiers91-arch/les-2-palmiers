-- Les 2 Palmiers — données de démonstration
-- Rejouable (upserts). Le catalogue (services/catégories/destinations) est dans
-- les migrations ; ici : l'appartement, ses équipements, ses tarifs saisonniers.
-- Les photos sont uploadées séparément dans le bucket Storage `apartment-media`.

-- =====================================================================
--  Appartement de démonstration
-- =====================================================================
insert into public.apartments
  (slug, name, summary, description, address, capacity, bedrooms, bathrooms,
   base_price, cleaning_fee, currency, cancellation_policy, checkin_from, checkout_before, status)
values (
  'les-2-palmiers',
  'Les 2 Palmiers – Appartement de Rêve',
  'Appartement meublé haut de gamme à Cotonou, avec Wi-Fi, parking, cuisine équipée, climatisation et espaces de détente.',
  'Un appartement d''exception pensé pour un séjour sans contraintes : tout l''équipement d''un logement premium, et une conciergerie qui prend en charge le reste (voiture, ménage, cuisinier, bien-être, tourisme…).',
  'Cotonou, Bénin',
  4, 2, 2,
  45000, 15000, 'XOF', 'moderate', '14:00', '11:00', 'published'
)
on conflict (slug) do update set
  name = excluded.name, summary = excluded.summary, description = excluded.description,
  address = excluded.address, capacity = excluded.capacity, bedrooms = excluded.bedrooms,
  bathrooms = excluded.bathrooms, base_price = excluded.base_price,
  cleaning_fee = excluded.cleaning_fee, cancellation_policy = excluded.cancellation_policy,
  checkin_from = excluded.checkin_from, checkout_before = excluded.checkout_before,
  status = excluded.status;

-- =====================================================================
--  Équipements
-- =====================================================================
insert into public.apartment_amenities (apartment_id, amenity_key, detail, position)
select a.id, x.key, x.detail, x.pos
from public.apartments a
cross join (values
  ('wifi',    'Fibre, débit adapté au télétravail', 1),
  ('parking', 'Place privée sécurisée',             2),
  ('kitchen', 'Cuisine entièrement équipée',        3),
  ('ac',      'Climatisation dans toutes les pièces',4),
  ('lounge',  'Salon et coin détente',              5),
  ('water',   'Réserve d''eau et groupe de secours', 6),
  ('security','Gardiennage 24h/24',                 7)
) as x(key, detail, pos)
where a.slug = 'les-2-palmiers'
on conflict (apartment_id, amenity_key) do update set detail = excluded.detail, position = excluded.position;

-- =====================================================================
--  Périodes tarifaires
-- =====================================================================
insert into public.price_rules (apartment_id, date_range, nightly_price, min_nights, discount_percent, label)
select a.id, daterange('2026-12-20','2027-01-05'), 65000, 3, 0, 'Haute saison – fêtes de fin d''année'
from public.apartments a where a.slug = 'les-2-palmiers'
on conflict on constraint price_rules_no_overlap do nothing;

insert into public.price_rules (apartment_id, date_range, nightly_price, min_nights, discount_percent, label)
select a.id, daterange('2026-09-15','2026-10-15'), 40000, 1, 10, 'Offre séjour long – rentrée'
from public.apartments a where a.slug = 'les-2-palmiers'
on conflict on constraint price_rules_no_overlap do nothing;
