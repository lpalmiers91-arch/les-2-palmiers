# Modèle de données (Supabase / Postgres)

> Lié à [ARCHITECTURE.md](ARCHITECTURE.md). Version 0.2 — 2026-09-08.
> Esquisse de schéma — à raffiner lors de la première migration. Tout est en `public` sauf mention. RLS **activée partout**.
> Rappels du parti pris démo : auth **e-mail + mot de passe** (téléphone = champ non vérifié), paiement **simulé** (mêmes tables et machine à états qu'un vrai paiement), assistant IA **à fournisseur interchangeable** (voir §8bis).

## 1. Identité & rôles

### `profiles`
| colonne | type | notes |
|---|---|---|
| `id` | uuid PK | = `auth.users.id` |
| `full_name` | text | |
| `phone` | text | format international +229 souhaité — **non vérifié** (pas d'OTP) |
| `phone_verified` | bool | défaut `false` — réservé à une évolution prod |
| `locale` | text | `fr` / `en`, défaut `fr` |
| `avatar_url` | text | Storage |
| `preferences` | jsonb | canaux de notif, etc. |
| `created_at` / `updated_at` | timestamptz | |

### `roles`
`id` (text PK) — `client`, `staff`, `coordinator`, `admin`. `label`, `description`.

### `user_roles`
`user_id` (fk profiles) · `role_id` (fk roles) · `granted_by` · `granted_at`. PK (`user_id`,`role_id`).

### `permissions`
`key` (text PK) — ex. `reservations.update`, `catalog.edit`, `pricing.edit`, `team.manage`, `payments.refund`, `reports.view`, `apartments.edit`, `availability.edit`. `label`.

### `role_permissions`
`role_id` · `permission_key`. PK des deux.

> Fonction `public.has_permission(uid uuid, perm text) returns boolean` (SECURITY DEFINER, stable) — utilisée dans les policies.
> Fonction `public.has_role(uid uuid, role text) returns boolean`.

### `staff_members` (optionnel, métadonnées RH légères)
`user_id` PK · `job_title` · `active` bool · `hired_at` · `notes`.

## 2. Hébergement

### `apartments`
| colonne | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `slug` | text unique | |
| `name` | text | « Les 2 Palmiers – Appartement de Rêve » |
| `summary` / `description` | text | |
| `address` | text | privé (affichage approximatif public) |
| `geo` | point | |
| `capacity` | int | voyageurs max |
| `bedrooms` / `bathrooms` | int | |
| `base_price` | numeric | par nuit, XOF |
| `cleaning_fee` | numeric | |
| `currency` | text | `XOF` |
| `cancellation_policy` | text enum | `flexible` / `moderate` / `strict` |
| `house_rules` | jsonb | |
| `status` | text | `draft` / `published` / `hidden` |
| `created_at` / `updated_at` | | |

### `apartment_amenities`
`apartment_id` · `amenity_key` (`wifi`,`parking`,`kitchen`,`ac`,`lounge`,…) · `detail` text.

### `apartment_media`
`id` · `apartment_id` · `type` (`photo`/`video`) · `storage_path` · `alt` · `position` · `is_cover` bool.

### `price_rules` (saisons / séjours longs)
`id` · `apartment_id` · `date_range` daterange · `nightly_price` · `min_nights` · `discount_percent` · `label`.

### `availability_blocks`
`id` · `apartment_id` · `date_range` daterange · `reason` (`maintenance`,`owner`,`external_ical`) · `created_by`.
> Contrainte d'exclusion GiST sur `apartment_id` + `date_range` partagée avec `reservations` pour empêcher tout chevauchement.

## 3. Réservations

### `reservations`
| colonne | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `reference` | text unique | ex. `L2P-2026-0042` |
| `apartment_id` | fk | |
| `guest_id` | fk profiles | |
| `date_range` | daterange | `[arrivée, départ)` |
| `guests_count` | int | |
| `nights` | int généré | |
| `nightly_price` | numeric | figé à la réservation |
| `fees` | jsonb | ménage, service… |
| `total_amount` | numeric | |
| `deposit_amount` | numeric | acompte demandé |
| `amount_paid` | numeric | maj par webhook |
| `status` | text | `pending_payment` / `confirmed` / `in_stay` / `completed` / `cancelled` / `no_show` |
| `cancellation` | jsonb | qui, quand, motif, remboursement |
| `source` | text | `web` / `staff` / `external` |
| `created_at` / `updated_at` | | |

> `EXCLUDE USING gist (apartment_id WITH =, date_range WITH &&) WHERE (status IN ('pending_payment','confirmed','in_stay'))`.

### `reservation_events`
`id` · `reservation_id` · `type` (`created`,`paid`,`checked_in`,`checked_out`,`modified`,`cancelled`) · `payload` jsonb · `actor_id` · `at`.

## 4. Services & commandes

### `service_categories`
`id` · `slug` · `label` · `position`.

### `services`
| colonne | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `slug` | text unique | `location-voiture`, `entretien`, `coiffure-tresses`, `cuisinier`, `pedicure-manucure`, `massage`, `recharge-transactions`, `couture`, `garde-enfants`, `sur-mesure` |
| `category_id` | fk | |
| `title` / `description` | text | |
| `pricing_mode` | text | `fixed` / `quote` / `metered` |
| `base_price` | numeric null | si `fixed` |
| `unit` | text | `prestation`, `heure`, `jour` |
| `options_schema` | jsonb | champs demandés au client |
| `lead_time_hours` | int | délai mini de réservation |
| `active` | bool | |
| `icon` | text | (aligné avec `src/lib/data.ts`) |

### `service_orders`
| colonne | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `reference` | text unique | |
| `service_id` | fk | |
| `customer_id` | fk profiles | |
| `reservation_id` | fk null | rattachement facultatif |
| `requested_at` | timestamptz | |
| `scheduled_for` | timestamptz null | fixé par le staff |
| `address` | text | défaut = appartement |
| `options` | jsonb | réponses au `options_schema` |
| `note` | text | |
| `status` | text | `requested` / `accepted` / `scheduled` / `in_progress` / `completed` / `declined` / `cancelled` |
| `decline_reason` | text null | |
| `price` | numeric null | fixé (auto ou par staff) |
| `payment_timing` | text | `prepaid` / `on_delivery` |
| `assigned_provider_id` | fk providers null | |
| `assigned_staff_id` | fk profiles null | |
| `created_at` / `updated_at` | | |

### `service_order_events`
Journal par commande (mêmes idées que `reservation_events`).

### `providers` (v1 : gérés par le staff)
`id` · `full_name` · `phone` · `skills` text[] · `active` · `notes` · `user_id` null (compte dédié en v2).

## 5. Paiements (simulés)

> En démo, `provider = 'sim'` et les transitions sont déclenchées par l'écran de simulation via l'Edge Function `payments-sim` (qui joue aussi le rôle du webhook). Structure et machine à états prêtes pour un agrégateur réel (`fedapay` / `kkiapay`).

### `payments`
| colonne | type | notes |
|---|---|---|
| `id` | uuid PK | |
| `internal_ref` | text unique | idempotence |
| `provider` | text | `sim` (démo) / `fedapay` / `kkiapay` |
| `provider_ref` | text null | id renvoyé par le simulateur ou l'agrégateur |
| `sim_outcome` | text null | `success` / `failure` / `pending` choisi dans l'écran de démo |
| `purpose` | text | `reservation` / `service_order` / `balance` |
| `reservation_id` / `service_order_id` | fk null | |
| `payer_id` | fk profiles | |
| `method` | text | `mtn` / `moov` / `celtis` / `card` |
| `amount` | numeric | |
| `currency` | text | `XOF` |
| `status` | text | `pending` / `paid` / `failed` / `refunded` / `partially_refunded` |
| `raw_webhook` | jsonb | dernière charge utile reçue (du simulateur ou de l'agrégateur) — non exposée au staff |
| `created_at` / `paid_at` / `updated_at` | | |

### `refunds`
`id` · `payment_id` · `amount` · `reason` · `status` · `requested_by` · `provider_ref` · `created_at`.

## 6. Messagerie

### `conversations`
`id` · `subject` · `type` (`reservation` / `support`) · `reservation_id` null · `customer_id` · `assigned_staff_id` null · `status` (`open`/`closed`) · `last_message_at`.

### `canned_responses` (modèles de réponse staff)
`id` · `title` · `body` · `category` · `created_by` · `active`.

### `messages`
`id` · `conversation_id` · `sender_id` · `body` text · `attachments` jsonb (paths Storage) · `created_at` · `system` bool (message auto).

### `message_reads`
`message_id` · `user_id` · `read_at`. PK des deux.

## 7. Notifications

### `notifications`
`id` · `user_id` · `type` · `title` · `body` · `data` jsonb · `channels` text[] (`in_app`,`email`,`push`,`whatsapp`) · `read_at` null · `sent_at` · `created_at`.

### `push_subscriptions`
`id` · `user_id` · `endpoint` · `keys` jsonb · `user_agent` · `created_at`.

## 8. Contenu & config

### `site_settings` (singleton)
`id` (=1) · `company` jsonb (nom, tél, e-mail, adresse) · `legal` jsonb (textes cgu/confidentialité/cookies) · `notification_defaults` jsonb · `payment_config` jsonb (non secret) · `locales` text[].

### `pages` (CMS léger optionnel)
`slug` · `title` · `blocks` jsonb · `published` · `updated_by` · `updated_at`.

### `destinations` (tourisme — repris de la référence vitrine)
`id` · `name` · `tag` · `description` · `media` · `position`.

## 8bis. Assistant IA

### `ai_settings` (singleton, éditable par l'admin)
`id` (=1) · `enabled_spaces` text[] (`public`,`client`,`staff`,`admin`) · `default_provider` · `default_model` · `provider_by_role` jsonb (ex. `{"admin":{"provider":"openai","model":"..."}}`) · `system_prompts` jsonb (par rôle) · `welcome_messages` jsonb · `quotas` jsonb (messages/jour par rôle) · `monthly_budget_usd` numeric null · `updated_by` · `updated_at`.
> Les **secrets** (clés API) restent dans les variables d'environnement des Edge Functions — **jamais** dans cette table.

### `ai_threads`
`id` · `user_id` · `space` (`public`/`client`/`staff`/`admin`) · `title` · `created_at` · `last_message_at`.

### `ai_messages`
`id` · `thread_id` · `role` (`user`/`assistant`/`tool`) · `content` text · `tool_calls` jsonb null · `tokens_in` / `tokens_out` int · `provider` / `model` (effectivement utilisés) · `created_at`.

### `ai_usage` (compteurs pour quotas & budget)
`id` · `user_id` · `day` date · `messages` int · `tokens_in` / `tokens_out` bigint · `est_cost_usd` numeric.

### `kb_articles` (base de connaissances)
`id` · `slug` · `title` · `body` markdown · `audience` (`public`/`client`/`staff`) · `tags` text[] · `embedding` vector · `updated_by` · `updated_at`.
> Extension `pgvector`. Embeddings générés via la couche d'abstraction IA (`AI_EMBEDDINGS_PROVIDER`).

## 9. Audit

### `audit_log` (append-only)
| colonne | type |
|---|---|
| `id` | bigint identity PK |
| `actor_id` | uuid null |
| `actor_role` | text |
| `action` | text (`insert`/`update`/`delete`/`login`/`refund`/…) |
| `entity` | text (nom de table) |
| `entity_id` | text |
| `before` | jsonb null |
| `after` | jsonb null |
| `ip` | inet null |
| `at` | timestamptz default now() |

> Alimentée par triggers `AFTER INSERT/UPDATE/DELETE` sur : `reservations`, `service_orders`, `payments`, `refunds`, `apartments`, `availability_blocks`, `price_rules`, `services`, `user_roles`, `role_permissions`, `ai_settings`, `site_settings`. Plus les événements d'auth staff/admin.
> `REVOKE UPDATE, DELETE ON audit_log FROM authenticated, anon, service_role;` — purge éventuelle par un job admin dédié uniquement.

## 10. Vues & agrégats (dashboard admin)

- `v_revenue_daily` : revenu payé par jour, ventilé `reservation` / `service_order`.
- `v_occupancy_monthly` : nuits vendues / nuits disponibles par mois et par appartement.
- `v_service_performance` : nb commandes, taux d'acceptation, délai moyen de traitement, CA par service.
- `v_staff_activity` : actions par employé sur une période (depuis `audit_log`).
- `v_pending_queue` : demandes de services + réservations nécessitant une action.

> Calculs lourds : `MATERIALIZED VIEW` rafraîchies par `pg_cron`, ou table de stats agrégées mise à jour par trigger.

## 11. Storage (buckets)

| bucket | accès | contenu |
|---|---|---|
| `apartment-media` | public en lecture | photos/vidéos publiées de l'appartement |
| `message-attachments` | privé (URL signées) | pièces jointes de messagerie |
| `avatars` | public en lecture | photos de profil |
| `reports` | privé | PDF de rapports générés |
| `identity` | privé, accès staff | pièces justificatives éventuelles (à éviter si possible — sensible) |

## 12. Principes RLS

- `client` : accès **uniquement** à ses propres `reservations`, `service_orders`, `payments`, `conversations`, `notifications` ; lecture du catalogue publié (`apartments`, `services`, `destinations`).
- `staff` / `coordinator` : lecture/écriture opérationnelle selon `has_permission()` ; **pas** de lecture des `payments.raw_webhook` ni des données `identity` sauf permission ; pas de gestion d'équipe.
- `admin` : accès complet sauf modification de `audit_log`.
- `anon` : lecture des seules ressources publiées de la vitrine.
- Toute écriture sensible passe par une fonction `SECURITY DEFINER` contrôlée plutôt qu'un `INSERT/UPDATE` direct quand la logique le demande (paiement, changement de statut, affectation).
