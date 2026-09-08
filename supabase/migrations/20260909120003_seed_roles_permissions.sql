-- Les 2 Palmiers — données de référence : rôles & permissions (Phase 1)
-- Ce n'est PAS de la donnée de démo : ces lignes font partie du schéma fonctionnel.
-- Idempotent (upsert).

-- =====================================================================
--  Rôles
-- =====================================================================
insert into public.roles (id, label, description, is_system) values
  ('client',      'Client',        'Utilisateur final : réserve, commande des services, échange.', true),
  ('staff',       'Staff',         'Employé opérationnel : accueil, traitement des réservations et demandes.', true),
  ('coordinator', 'Coordinateur',  'Coordonne les prestations de services et les prestataires.', true),
  ('admin',       'Administrateur','Propriétaire : pilotage complet, équipe, finances, paramètres.', true)
on conflict (id) do update
  set label = excluded.label, description = excluded.description, is_system = excluded.is_system;

-- =====================================================================
--  Permissions
-- =====================================================================
insert into public.permissions (key, label, description) values
  ('reservations.view',      'Voir les réservations',            'Consulter la liste et le détail des réservations.'),
  ('reservations.update',    'Modifier les réservations',        'Changer dates, montants, statut (tracé).'),
  ('reservations.checkin',   'Check-in / check-out',             'Enregistrer arrivées et départs.'),
  ('services.orders.view',   'Voir les commandes de services',   'Consulter la file et le détail des demandes.'),
  ('services.orders.manage', 'Gérer les commandes de services',  'Accepter/refuser, fixer le prix, planifier, clôturer.'),
  ('providers.manage',       'Gérer les prestataires',           'Carnet de prestataires et affectations.'),
  ('catalog.edit',           'Éditer le catalogue de services',  'Activer/désactiver et décrire les services.'),
  ('pricing.edit',           'Éditer les tarifs',                'Prix de base, saisons, tarifs indicatifs des services.'),
  ('apartments.edit',        'Éditer les appartements',          'Description, équipements, règles, politique d''annulation.'),
  ('availability.edit',      'Gérer les disponibilités',         'Blocages et déblocages de dates.'),
  ('media.edit',             'Gérer les médias',                 'Photos et vidéos de l''appartement.'),
  ('clients.view',           'Voir les clients',                 'Fiches clients et historique.'),
  ('clients.notes',          'Notes internes clients',           'Ajouter/éditer des notes internes.'),
  ('messages.handle',        'Gérer la messagerie',              'Répondre aux clients, attribuer des conversations.'),
  ('payments.view',          'Voir les paiements',               'Transactions et rapprochements.'),
  ('payments.refund',        'Rembourser',                       'Émettre un remboursement (simulé en démo).'),
  ('reports.view',           'Voir les rapports',                'Dashboard, statistiques, exports.'),
  ('team.manage',            'Gérer l''équipe',                  'Employés, rôles et permissions.'),
  ('audit.view',             'Voir le journal d''audit',         'Historique des actions.'),
  ('settings.edit',          'Éditer les paramètres',            'Infos entreprise, textes légaux, canaux.'),
  ('ai.configure',           'Configurer l''assistant IA',       'Fournisseur, modèle, prompts, quotas.')
on conflict (key) do update
  set label = excluded.label, description = excluded.description;

-- =====================================================================
--  Attribution des permissions aux rôles
-- =====================================================================

-- admin : toutes les permissions
insert into public.role_permissions (role_id, permission_key)
select 'admin', key from public.permissions
on conflict do nothing;

-- staff : opérationnel
insert into public.role_permissions (role_id, permission_key) values
  ('staff','reservations.view'),
  ('staff','reservations.update'),
  ('staff','reservations.checkin'),
  ('staff','services.orders.view'),
  ('staff','services.orders.manage'),
  ('staff','providers.manage'),
  ('staff','availability.edit'),
  ('staff','clients.view'),
  ('staff','clients.notes'),
  ('staff','messages.handle'),
  ('staff','payments.view')
on conflict do nothing;

-- coordinator : centré services
insert into public.role_permissions (role_id, permission_key) values
  ('coordinator','services.orders.view'),
  ('coordinator','services.orders.manage'),
  ('coordinator','providers.manage'),
  ('coordinator','messages.handle'),
  ('coordinator','clients.view')
on conflict do nothing;

-- client : aucune permission interne (accès régi par les policies "propriétaire")
