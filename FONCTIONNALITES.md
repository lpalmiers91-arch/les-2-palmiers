# Fonctionnalités détaillées & gestion

> Lié à [SPEC.md](SPEC.md), [ARCHITECTURE.md](docs/ARCHITECTURE.md), [MODELE-DONNEES.md](docs/MODELE-DONNEES.md), [ASSISTANT-IA.md](docs/ASSISTANT-IA.md).
> Version 0.1 — 2026-09-08. Décrit **chaque fonctionnalité** de la solution et **comment elle est gérée** (données, autorisations, temps réel, UI, cas limites). But démonstratif : paiement simulé, auth e-mail/mot de passe, un projet Supabase, assistant IA à fournisseur interchangeable.

---

## A. Principes de gestion transversaux

Ces règles s'appliquent partout et évitent de les répéter dans chaque module.

### A.1 Rôles
- `client`, `staff`, `coordinator`, `admin` — un utilisateur peut cumuler plusieurs rôles (`user_roles`).
- Le rôle détermine : l'espace accessible (`/app`, `/staff`, `/admin`), les menus affichés, et surtout les **politiques RLS** en base.
- Le frontend lit les rôles depuis le JWT (custom claims) pour l'affichage ; **la base tranche** (RLS) pour l'accès réel aux données.

### A.2 Permissions fines (staff)
- Table `permissions` (clés : `reservations.update`, `catalog.edit`, `pricing.edit`, `apartments.edit`, `availability.edit`, `payments.view`, `payments.refund`, `team.manage`, `reports.view`, `audit.view`…).
- `role_permissions` relie rôle → permissions. L'admin peut créer des rôles staff personnalisés (ex. « Accueil », « Coordination services »).
- Fonction Postgres `has_permission(uid, 'clé')` appelée dans les policies **et** exposée au frontend pour masquer/désactiver les boutons.

### A.3 Machines à états (statuts)
Chaque objet transactionnel a un statut explicite, changé uniquement par des transitions autorisées (fonction `SECURITY DEFINER` ou policy + trigger de validation) :
- **Réservation** : `pending_payment → confirmed → in_stay → completed` ; sorties `cancelled`, `no_show`.
- **Commande de service** : `requested → accepted → scheduled → in_progress → completed` ; sorties `declined`, `cancelled`.
- **Paiement (simulé)** : `pending → paid | failed | refunded | partially_refunded`.
- **Conversation** : `open ↔ closed`.
Toute transition écrit un événement (`reservation_events`, `service_order_events`) : qui, quand, quoi, avant/après.

### A.4 Notifications (voir module M)
Tout changement d'état notable déclenche une `notification` → livrée en temps réel (cloche), et selon les préférences : e-mail, push PWA (, WhatsApp en option prod).

### A.5 Journal d'audit (voir module R)
Toute écriture sensible (réservations, commandes, paiements, prix, disponibilités, catalogue, rôles, permissions) est tracée dans `audit_log` (append-only) par des triggers `AFTER`.

### A.6 Temps réel
Supabase Realtime pour : messagerie, files d'attente staff, cloche de notifications, calendrier de disponibilités partagé. Le frontend s'abonne aux tables concernées, filtré par RLS.

### A.7 Internationalisation
- FR par défaut, structure i18n en place (`src/lib/i18n`), EN ajouté plus tard.
- Contenu éditorial (appartement, services, destinations, pages légales) : colonnes `*_i18n jsonb` ou table de traductions ; fallback FR si une langue manque.

### A.8 Argent
- Devise unique **XOF** (franc CFA), pas de décimales. Montants stockés en entier (unités XOF).
- Prix **figés** au moment de la réservation/commande (on ne recalcule jamais a posteriori).

### A.9 Accès & sécurité par défaut
- RLS activée sur **toutes** les tables ; `anon` ne voit que le contenu publié de la vitrine.
- Secrets côté serveur uniquement (Edge Functions / env Vercel).
- Rate-limiting sur auth, paiement simulé, assistant IA.

---

## B. Vitrine & contenu public

**Ce que l'utilisateur fait** : découvre la marque, l'appartement, les services, les destinations ; lance une réservation ; contacte l'entreprise.

**Pages** : accueil, l'appartement (galerie photos/vidéos, équipements, règles, conditions d'annulation), les services (détail + tarifs indicatifs), à propos, contact, + pages légales (module C).

**Comment c'est géré** :
- Contenu servi depuis Supabase (`apartments`, `apartment_media`, `apartment_amenities`, `services`, `service_categories`, `destinations`, `pages`), avec **fallback statique** (les données de [REFERENCE-VITRINE.md](docs/REFERENCE-VITRINE.md)) si la base est vide.
- Rendu **SSR/ISR** sur Vercel : pages publiques pré-rendues, revalidation à intervalle + à la demande quand le staff modifie un contenu (webhook `revalidateTag`).
- Design, palette, polices et textes : repris de l'archive vitrine.
- SEO : métadonnées, Open Graph, `sitemap.xml`, `robots.txt`, données structurées `LodgingBusiness` ; **domaine `les2palmiers.site`**.
- Médias : bucket `apartment-media` (public en lecture), images servies via `next/image`, vidéos en `<video>` avec poster.

**Cas limites** : base injoignable → fallback statique ; média manquant → placeholder ; service désactivé → masqué de la vitrine mais conservé en base.

---

## C. Consentement cookies & pages légales

**Ce que l'utilisateur fait** : au 1er accès, choisit ce qu'il accepte (Nécessaires / Mesure d'audience / Marketing) ; peut revenir sur son choix via un lien en pied de page ; consulte les politiques.

**Comment c'est géré** :
- Bandeau affiché tant qu'aucun choix n'est enregistré. Choix stocké en `localStorage` (`consent`) + cookie court pour le SSR.
- **Aucun script non nécessaire** (analytics, pixels) n'est chargé avant consentement — chargement conditionnel côté client.
- Pages légales (`pages` : `cgu`, `confidentialite`, `cookies`, `mentions-legales`) éditables par l'admin (module Q), versionnées.
- Droits utilisateur : export de ses données (JSON, généré à la demande), suppression de compte (module D).
- Registre de traitement (APDP Bénin / RGPD-like) : document tenu à part, référencé dans la politique de confidentialité.

**Cas limites** : `localStorage` indisponible → bandeau reste affiché, rien de non-essentiel ne se charge (comportement sûr).

---

## D. PWA (application web installable)

**Ce que l'utilisateur fait** : installe l'app sur son téléphone ; l'utilise avec une connexion faible ou absente ; reçoit des notifications push.

**Comment c'est géré** :
- `manifest.webmanifest` (nom, icônes maskable, thème `#22392c`, `display: standalone`).
- Service worker (Serwist) : pré-cache de la coquille + pages vitrines ; runtime cache *stale-while-revalidate* pour images ; *NetworkFirst* + repli cache pour les données Supabase déjà consultées (historique, fiche appartement).
- **Envoi de messages hors-ligne** : file d'attente (Background Sync) rejouée à la reconnexion.
- **Push** : abonnement Web Push (VAPID), table `push_subscriptions` ; l'Edge Function `notify` pousse les alertes.
- Invite d'installation personnalisée après une action significative (réservation consultée, 2ᵉ visite).

**Cas limites** : navigateur sans support SW → app fonctionne en ligne normalement ; push refusé → on retombe sur cloche + e-mail.

---

## E. Comptes & authentification

**Ce que l'utilisateur fait** : crée un compte (e-mail + mot de passe), se connecte, réinitialise son mot de passe, gère son profil, supprime son compte.

**Comment c'est géré** :
- **Supabase Auth**, méthode **e-mail + mot de passe** uniquement. Confirmation d'e-mail activable. Réinitialisation par lien e-mail. (Magic link possible en option.)
- **Pas d'OTP SMS.** Le **téléphone** est un champ de `profiles`, **non vérifié**, utilisé pour l'affichage et le contact.
- À la 1ʳᵉ connexion : trigger `handle_new_user` crée la ligne `profiles` et attribue le rôle `client` par défaut.
- **Staff/admin** : comptes créés par un admin (module P), jamais par auto-inscription. 2FA TOTP activable (recommandée admin).
- Profil : nom, téléphone, langue, préférences de notification (canaux), avatar (bucket `avatars`).
- **Suppression de compte** : anonymise `profiles`, détache les données personnelles, **conserve** les enregistrements de réservation/paiement requis comme preuves (marqués « compte supprimé »).
- Sessions : cookies gérés par `@supabase/ssr` ; middleware Next.js protège `/app`, `/staff`, `/admin` et redirige selon le rôle.

**Cas limites** : e-mail déjà utilisé → message clair ; tentative d'accès à un espace non autorisé → redirection vers l'espace du rôle ; session expirée → re-login en gardant l'URL cible.

---

## F. Rôles & permissions (mécanique)

**Ce que l'admin fait** : crée des rôles staff, coche des permissions, attribue un ou plusieurs rôles à un employé, révoque un accès.

**Comment c'est géré** :
- `roles`, `user_roles`, `permissions`, `role_permissions` + `has_role()` / `has_permission()`.
- Toute modification de rôle/permission est auditée et invalide les sessions concernées (l'employé doit se reconnecter, ou le JWT est rafraîchi).
- Matrice de permissions éditée dans `/admin/equipe` (UI en tableau à cases).
- Le menu et les actions de chaque espace sont générés à partir des permissions de l'utilisateur.

**Cas limites** : retirer la dernière permission `team.manage` du dernier admin → interdit (garde-fou) ; employé désactivé → accès coupé immédiatement, données conservées.

---

## G. Appartement — contenu, équipements, médias

**Ce que le staff/admin fait** : édite la description, les équipements, les règles, la politique d'annulation ; ajoute/ordonne/supprime photos et vidéos ; publie ou masque l'appartement.

**Comment c'est géré** :
- `apartments` (1 en v1, le schéma en supporte plusieurs), `apartment_amenities` (clés normalisées : `wifi`, `parking`, `kitchen`, `ac`, `lounge`…), `apartment_media` (`photo`/`video`, `position`, `is_cover`).
- Upload direct navigateur → Storage (`apartment-media`) via URL signée ; miniatures/optimisation à l'affichage (`next/image`).
- Édition soumise à `has_permission('apartments.edit')`.
- Publication (`status: draft/published/hidden`) → revalidation ISR de la vitrine.

**Cas limites** : suppression d'une photo de couverture → la suivante devient couverture ; vidéo trop lourde → limite de taille + message.

---

## H. Disponibilités & tarification

**Ce que le staff/admin fait** : bloque/débloque des dates (maintenance, usage propriétaire), définit le prix de base, ajoute des périodes tarifaires (saisons) et des règles de séjour minimum / remise long séjour.

**Comment c'est géré** :
- `availability_blocks` (daterange + motif) et `price_rules` (daterange + prix nuitée + min_nights + remise).
- **Calendrier partagé temps réel** : staff et admin voient les mêmes blocages, réservations et périodes tarifaires ; abonnement Realtime.
- **Disponibilité réelle** = aucune `reservation` active **et** aucun `availability_block` sur la période demandée. Vérifiée par une fonction SQL `is_available(apartment_id, range)`.
- **Prix d'un séjour** : fonction SQL `quote_stay(apartment_id, range, guests)` → applique `price_rules` nuit par nuit, ajoute `cleaning_fee`, applique la remise long séjour, renvoie le détail ligne à ligne.
- Import/export **iCal** : optionnel (post-démo) — un bloc `external_ical` par événement importé.

**Cas limites** : blocage qui chevauche une réservation confirmée → refusé ; changement de prix → n'affecte pas les réservations déjà prises (prix figé).

---

## I. Recherche & réservation d'appartement

**Ce que le client fait** : choisit dates + nombre de voyageurs → voit la disponibilité et le prix → se connecte/s'inscrit → confirme → paie (simulé) → reçoit la confirmation.

**Comment c'est géré** :
1. Recherche : appel `is_available()` + `quote_stay()` → affichage « disponible / indisponible » + devis détaillé. Aucune donnée d'autres réservations exposée.
2. Création : Edge Function / RPC `create_reservation(range, guests)` en **transaction** :
   - re-vérifie la disponibilité,
   - insère la réservation en `pending_payment` avec les prix **figés**,
   - la **contrainte d'exclusion GiST** `EXCLUDE USING gist (apartment_id WITH =, date_range WITH &&) WHERE status IN ('pending_payment','confirmed','in_stay')` garantit qu'aucune autre réservation ne peut occuper les mêmes nuits (anti-surbooking même en cas de clics simultanés).
3. Récapitulatif : nuits, `cleaning_fee`, éventuelle remise, total, acompte configurable (% ou 100 %).
4. Paiement simulé (module J).
5. À `paid` : réservation `confirmed`, `reference` générée (`L2P-AAAA-NNNN`), e-mail + notification, ouverture d'une conversation « réservation », historique mis à jour.
6. **Expiration** : une réservation `pending_payment` non payée après X minutes est libérée automatiquement (`pg_cron` + passage en `cancelled` motif `payment_timeout`).

**Modification / annulation** :
- Client : demande d'annulation → calcul du remboursement selon `cancellation_policy` (`flexible`/`moderate`/`strict`) → statut `cancelled`, remboursement simulé.
- Modification de dates : le client ne modifie pas seul ; il crée une demande, le staff applique (module N) avec traçabilité.

**Cas limites** : deux clients réservent la même semaine à la seconde près → un seul passe (contrainte base), l'autre reçoit « ces dates viennent d'être prises » ; paiement échoué → réservation reste `pending_payment` et peut être relancée jusqu'à expiration.

---

## J. Paiement — **simulé**

**Ce que le client fait** : choisit une méthode (MTN / Moov / Celtis / carte), arrive sur un écran de « paiement », puis **le parcours se déroule comme un vrai paiement** — sauf que l'issue est déclenchée par des boutons de simulation.

**Comment c'est géré** :
- Edge Function `payments-sim` :
  - `init` : crée `payments` en `pending` (`internal_ref` unique = idempotence), renvoie un identifiant d'écran.
  - `resolve` : reçoit le choix de simulation (`success` / `failure` / `pending`) + éventuel délai artificiel, met la transaction à `paid` / `failed` / laisse `pending`. Ce endpoint joue le rôle du **webhook** d'un vrai agrégateur (même signature vérifiée, même idempotence).
- Écran de simulation (UI dédiée, clairement marquée « Démonstration ») : « Confirmer le paiement », « Simuler un échec », « Simuler une attente », choix de la méthode affichée.
- À `paid` : trigger → la réservation/commande liée passe à l'état confirmé, `notify` envoie la confirmation, un **reçu PDF** est généré (Edge Function `reports`) et déposé dans le bucket `reports`.
- Historique : `/app/paiements` liste toutes les transactions du client avec statut et reçu ; le staff voit les paiements liés à un dossier (sans données brutes de webhook) ; l'admin voit tout et peut lancer un **remboursement simulé** (`refunds`).
- **Machine à états, idempotence, rapprochement réservation↔paiement, gestion des `pending`/timeouts** : identiques à une intégration réelle.

**Bascule production** : ajouter un adaptateur `PaymentProvider` (`fedapay.ts` / `kkiapay.ts`) derrière la même interface ; `PAYMENTS_PROVIDER=fedapay`. Le reste de l'app est inchangé.

**Cas limites** : double clic sur « Confirmer » → une seule transaction (idempotence) ; simulation « attente » puis abandon → réservation expire normalement ; remboursement > montant payé → refusé.

---

## K. Services additionnels — catalogue

**Ce que le staff/admin fait** : active/désactive un service, édite titre/description/tarif indicatif/délai mini/champs demandés au client, classe par catégorie.

**Comment c'est géré** :
- `service_categories`, `services` (`pricing_mode` : `fixed` / `quote` / `metered` ; `base_price` ; `unit` ; `options_schema` jsonb ; `lead_time_hours` ; `active` ; `icon`).
- Les 10 services de [REFERENCE-VITRINE.md](docs/REFERENCE-VITRINE.md) constituent le seed.
- `options_schema` décrit les champs du formulaire client (ex. cuisinier : nb de personnes, type de repas, allergies ; voiture : durée, avec/sans chauffeur). Rendu dynamiquement côté client + validé par Zod généré depuis le schéma.
- Édition soumise à `has_permission('catalog.edit')` / `pricing.edit`.

**Cas limites** : désactiver un service avec des commandes en cours → le service reste visible pour ces commandes, masqué du catalogue ; changement de prix → n'affecte pas les commandes déjà passées.

---

## L. Services additionnels — commande & suivi

**Ce que le client fait** : depuis une réservation active **ou** la page Services, commande un service : créneau souhaité, options, adresse (défaut = l'appartement), note ; paie tout de suite ou à la prestation ; suit l'avancement.

**Comment c'est géré** :
- `service_orders` (`reference`, `service_id`, `customer_id`, `reservation_id?`, `scheduled_for?`, `address`, `options` jsonb, `status`, `price?`, `payment_timing` `prepaid`/`on_delivery`, `assigned_provider_id?`, `assigned_staff_id?`).
- **Devis** :
  - `fixed` → prix connu immédiatement, paiement `prepaid` possible.
  - `quote` → commande créée en `requested` sans prix ; le staff fixe `price` → le client reçoit une notif « devis prêt » et valide.
  - `metered` → estimation, ajustement à la clôture.
- Respect du `lead_time_hours` : créneau trop proche refusé à la saisie.
- Statuts : `requested → accepted → scheduled → in_progress → completed` (ou `declined` avec motif, `cancelled`). Chaque transition = événement + notification.
- Paiement : `prepaid` → module J avant confirmation ; `on_delivery` → transaction créée `pending`, résolue à la clôture (simulée).
- Suivi client : `/app/services` — timeline de statut, créneau, prix, prestataire (prénom seulement), fil de discussion rattaché.

**Cas limites** : client annule après affectation d'un prestataire → notif au staff + éventuels frais selon règle ; service « sur mesure » → toujours `quote`, échange libre avec le staff.

---

## M. Prestataires

**Ce que le staff fait (v1)** : gère un carnet de prestataires (chauffeur, coiffeuse, cuisinier…) et les affecte aux commandes.

**Comment c'est géré** :
- `providers` (`full_name`, `phone`, `skills[]`, `active`, `notes`, `user_id?` — compte dédié en v2).
- Affectation depuis la fiche commande : filtre par `skills` correspondant au service.
- Le client ne voit que le **prénom** du prestataire affecté.
- v2 (post-démo) : espace prestataire (missions, accepter/refuser, marquer terminé) — le champ `user_id` est déjà prévu.

---

## N. Messagerie

**Ce que l'utilisateur fait** : échange avec l'entreprise — un fil par réservation + un fil « support » général ; joint des photos ; voit les accusés de lecture ; reçoit une notif à chaque message.

**Comment c'est géré** :
- `conversations` (`type` `reservation`/`support`, `reservation_id?`, `customer_id`, `status`, `last_message_at`), `messages` (`sender_id`, `body`, `attachments` jsonb, `system` bool), `message_reads`.
- **Temps réel** : abonnement Realtime sur `messages` filtré par conversation ; indicateur « en train d'écrire » via Realtime broadcast (éphémère).
- Pièces jointes : bucket privé `message-attachments`, URL signées à l'affichage.
- Notifications : trigger sur `messages` (hors messages `system`) → `notifications` → `notify`.
- Côté staff : file des conversations, filtres (non lues, par réservation), **modèles de réponses** (`canned_responses`), attribution d'une conversation à un employé.
- Messages `system` : générés par les transitions d'état (« Réservation confirmée », « Devis prêt : 15 000 XOF »).

**Cas limites** : envoi hors-ligne → file d'attente PWA, marqué « en cours d'envoi » ; conversation fermée → réouverte automatiquement à la réception d'un nouveau message.

---

## O. Notifications

**Ce que l'utilisateur fait** : voit une cloche avec les non-lues ; règle ses canaux (in-app / e-mail / push) ; clique une notif → arrive sur l'objet concerné.

**Comment c'est géré** :
- `notifications` (`user_id`, `type`, `title`, `body`, `data` jsonb, `channels[]`, `read_at?`) + `push_subscriptions`.
- Producteurs : triggers (nouveau message, changement de statut, devis, paiement, rappel de check-in J-1) et jobs `pg_cron` (rappels, relances de paiement).
- Distribution : Edge Function `notify` lit les préférences du destinataire (`profiles.preferences`) et envoie sur chaque canal actif :
  - **in-app** : insertion → Realtime → cloche,
  - **e-mail** : Resend/SMTP (en démo, peut logger au lieu d'envoyer),
  - **push** : Web Push VAPID,
  - **WhatsApp** : hors périmètre démo, prévu.
- Centre de notifications `/app/notifications` : liste, marquer lu/tout lu, filtre par type.

**Cas limites** : e-mail en échec → retry avec back-off, puis abandon silencieux (la notif in-app reste) ; abonnement push expiré → nettoyé.

---

## P. Historique client

**Ce que le client fait** : consulte ses réservations (passées / à venir), ses commandes de services, ses paiements et reçus.

**Comment c'est géré** :
- Vues filtrées par `guest_id = auth.uid()` (RLS). Onglets : Réservations, Services, Paiements.
- Chaque ligne → page de détail avec timeline d'événements (`*_events`), documents (reçus PDF), accès au fil de discussion.
- Données mises en cache PWA pour consultation hors-ligne.

---

## Q. Espace staff — tableau de bord & opérations

**Ce que le staff fait** : traite l'activité quotidienne selon ses permissions.

**Modules** :
1. **Dashboard opérationnel** : arrivées / départs du jour, demandes de services en attente (file priorisée par ancienneté + créneau), messages non lus, tâches assignées. Temps réel.
2. **Réservations** : liste filtrable (statut, dates, client), détail, **check-in / check-out** (passage `in_stay` / `completed`), notes internes, modification encadrée (dates, montant) — chaque modif est tracée et notifiée au client. Soumis à `reservations.update`.
3. **Demandes de services** : accepter / refuser (motif obligatoire), fixer le prix (`quote`), planifier (`scheduled_for`), **affecter un prestataire**, faire avancer les statuts, clôturer (déclenche l'encaissement `on_delivery`).
4. **Clients** : fiche (coordonnées, historique, préférences, notes internes). **Pas d'accès** aux données de paiement brutes.
5. **Communication** : messagerie + modèles de réponses + envoi de notifications ciblées.
6. **Appartement & disponibilités** : blocages, prix par période, contenus/médias — **selon permissions** (`availability.edit`, `pricing.edit`, `apartments.edit`).
7. **Catalogue de services** : activer/désactiver, éditer descriptions et tarifs indicatifs — selon `catalog.edit`.
8. **Suivi selon rôle** : chaque écran n'affiche que les actions permises ; toutes les actions de l'employé sont visibles par l'admin (`v_staff_activity`, `audit_log`).

**Comment c'est géré** : mêmes tables que le client, policies RLS élargies conditionnées par `has_permission()` ; files et compteurs alimentés par des vues (`v_pending_queue`) + Realtime.

**Cas limites** : deux employés ouvrent la même demande → verrou optimiste (`updated_at`), le second est prévenu d'un conflit ; refus sans motif → bloqué.

---

## R. Espace admin — dashboard, statistiques, rapports

**Ce que l'admin fait** : pilote l'activité, analyse, exporte.

**Modules** :
1. **Dashboard** : KPIs (revenu total, revenu hébergement, revenu services, taux d'occupation, panier moyen, délai moyen de traitement d'une demande, taux de refus, demandes en attente) + graphiques par période. Voir skill `dataviz` pour la présentation.
2. **Statistiques réservations & revenus** : par mois, par service, par méthode de paiement, saisonnalité ; tendance simple (comparaison période précédente).
3. **Appartements** : création, contenus, équipements, règles, politique d'annulation, prix de base et saisons.
4. **Disponibilités** : calendrier global, blocages, (iCal en option).
5. **Paiements** : toutes les transactions, statut, rapprochement, **remboursements** (simulés), litiges, paramètres du simulateur (et, plus tard, config agrégateur réel).
6. **Rapports** : génération sur période paramétrable (revenus, occupation, services, activité équipe) → export **PDF & CSV** (Edge Function `reports`), envoi programmé par e-mail (`pg_cron` + `notify`).
7. **Historique des actions (audit)** : module S.
8. **Équipe & permissions** : module F (UI).
9. **Paramètres** : module T.
10. **Assistant IA** : configuration (module U) — fournisseur, modèle, prompts, quotas, activation par espace.

**Comment c'est géré** :
- Agrégats via vues SQL (`v_revenue_daily`, `v_occupancy_monthly`, `v_service_performance`, `v_staff_activity`, `v_pending_queue`) ; les calculs lourds en `MATERIALIZED VIEW` rafraîchies par `pg_cron`.
- Accès réservé aux `admin` (RLS) ; `reports.view` / `audit.view` peuvent être délégués à un rôle staff.
- Exports générés côté Edge Function (pas de gros calcul dans le navigateur).

**Cas limites** : période sans données → graphiques vides mais lisibles (pas d'erreur) ; export volumineux → génération asynchrone + notification quand le fichier est prêt.

---

## S. Journal d'audit

**Ce que l'admin fait** : consulte qui a fait quoi, quand, sur quel objet, avec la valeur avant/après ; filtre par acteur, type d'action, entité, période.

**Comment c'est géré** :
- Table `audit_log` **append-only** : `actor_id`, `actor_role`, `action`, `entity`, `entity_id`, `before` jsonb, `after` jsonb, `ip`, `at`.
- Alimentée par triggers `AFTER INSERT/UPDATE/DELETE` sur les tables sensibles (réservations, commandes, paiements, remboursements, appartements, blocages, règles de prix, services, `user_roles`, `role_permissions`) + événements d'auth (login staff/admin).
- `REVOKE UPDATE, DELETE` pour tous les rôles applicatifs → inviolable. Purge éventuelle par un job dédié uniquement.
- UI `/admin/audit` : tableau filtrable, diff avant/après lisible.

---

## T. Paramètres & configuration

**Ce que l'admin fait** : édite les informations de l'entreprise (nom, téléphones, e-mail, adresse), les textes légaux, les canaux de notification par défaut, les langues, les clés d'intégration non secrètes.

**Comment c'est géré** :
- `site_settings` (singleton) : `company` jsonb, `legal` jsonb, `notification_defaults` jsonb, `payment_config` jsonb (non secret), `locales[]`.
- Les **secrets** (clés API IA, e-mail) restent dans les variables d'environnement (Vercel / Supabase), **jamais** en base ni exposés au frontend.
- Toute modification est auditée ; les pages publiques concernées sont revalidées (ISR).

---

## U. Assistant IA (résumé — détail dans [ASSISTANT-IA.md](docs/ASSISTANT-IA.md))

**Ce que l'utilisateur fait** : ouvre le widget (bouton flottant), pose une question ou demande une action ; selon son rôle, l'assistant l'aide à réserver, commander, résumer un dossier, interroger les chiffres.

**Comment c'est géré** :
- **Couche multi-fournisseurs** (`supabase/functions/_shared/ai`) : interface `AiProvider` commune, adaptateurs Claude / OpenAI / Gemini / Mistral / API compatible OpenAI / **mock**. Choix par variable d'env (`AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`, `AI_BASE_URL`, + repli `AI_FALLBACK_*`). Ajouter un fournisseur = ajouter **un fichier**.
- Edge Function `ai-assistant` : authentifie, charge le **contexte autorisé selon le rôle**, construit le system prompt, appelle le fournisseur en **streaming (SSE)**, exécute les **outils** (format neutre → format natif du fournisseur), reboucle, renvoie réponse + actions proposées + sources.
- **Outils** : `check_availability`, `list_my_reservations`, `draft_service_order`, `draft_message`, `get_reservation_dossier`, `search_queue`, `get_kpi`, `search_kb`… chacun ré-applique la RLS avec le JWT de l'utilisateur.
- **Garde-fous** : aucune écriture directe (l'assistant *propose*, l'utilisateur *confirme*), pas de PII d'un tiers, pas de secrets, hors périmètre → orientation humaine, quotas + budget dans l'Edge Function, widget non chargé sans consentement cookies, chaque échange stocké (`ai_threads` / `ai_messages`), appels d'outils staff/admin audités.
- **Base de connaissances** : `kb_articles` + `pgvector` ; embeddings aussi via la couche d'abstraction (`AI_EMBEDDINGS_PROVIDER`).
- **Config admin** : table `ai_settings` — fournisseur/modèle par défaut (et par rôle), activation par espace, quotas, édition des prompts et messages d'accueil sans redéploiement.
- **Mode démo** : `AI_PROVIDER=echo` → réponses scriptées, aucune clé requise ; on bascule vers un vrai fournisseur en changeant une variable.

**Cas limites** : fournisseur en panne / quota atteint → repli sur `AI_FALLBACK_PROVIDER`, sinon message « assistant momentanément indisponible, contactez l'équipe » ; réponse hors sujet → garde-fou + suggestion d'action.

---

## V. Données de démonstration (seed)

**Objectif** : à l'ouverture, la solution est déjà « habitée » pour la démo.

**Contenu du `supabase/seed.sql`** :
- 1 appartement publié, complet (équipements, ~8 photos placeholder, 1 vidéo), prix de base, 1 saison, 1 politique d'annulation `moderate`.
- 10 services (données de [REFERENCE-VITRINE.md](docs/REFERENCE-VITRINE.md)) avec `options_schema` réalistes.
- 6 destinations.
- Rôles + permissions + 1 rôle staff personnalisé « Accueil ».
- **Comptes** : `client@`, `staff@`, `admin@les2palmiers.site` (mots de passe dans `docs/COMPTES-DEMO.md`, à créer au seed).
- Historique crédible : 3-4 réservations à divers statuts, 5-6 commandes de services, quelques paiements `paid`/`failed`, 2 conversations avec messages, des notifications, des entrées d'audit.
- 8-10 `kb_articles` (FAQ check-in, wifi, quartier, chaque service, annulation).

**Comment c'est géré** : `seed.sql` idempotent (upserts), rejouable ; sert aussi de « sauvegarde » de l'état de démo. Un script `npm run db:reset` remet l'environnement à zéro + seed.

---

## W. Récapitulatif « qui peut quoi »

| Capacité | Visiteur | Client | Staff (selon perms) | Admin |
|---|:---:|:---:|:---:|:---:|
| Voir la vitrine, les services, les destinations | ✅ | ✅ | ✅ | ✅ |
| Créer un compte | ✅ | — | — | — |
| Réserver, payer (simulé), commander des services | — | ✅ | au nom d'un client | ✅ |
| Messagerie avec l'entreprise | — | ✅ | ✅ | ✅ |
| Voir / traiter les réservations & demandes | — | les siennes | ✅ | ✅ |
| Gérer disponibilités / prix / catalogue / médias | — | — | selon permission | ✅ |
| Voir les paiements | — | les siens | agrégé, sans données brutes | ✅ |
| Rembourser (simulé) | — | — | si `payments.refund` | ✅ |
| Dashboard, statistiques, rapports | — | — | si `reports.view` | ✅ |
| Gérer l'équipe & les permissions | — | — | — | ✅ |
| Journal d'audit | — | — | si `audit.view` | ✅ |
| Configurer l'assistant IA | — | — | — | ✅ |
| Utiliser l'assistant IA | ✅ (limité) | ✅ | ✅ | ✅ |
