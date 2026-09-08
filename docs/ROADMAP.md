# Roadmap

> Lié à [SPEC.md](../SPEC.md) et [FONCTIONNALITES.md](../FONCTIONNALITES.md). Version 0.2 — 2026-09-08.
> Développeur solo, phases séquentielles. But démonstratif : paiement simulé, auth e-mail/mot de passe, un seul projet Supabase, assistant IA à fournisseur interchangeable.

## Phase 0 — Préparation de l'environnement
- [ ] Créer le projet **Supabase** (région eu-west), un seul.
- [ ] Créer le projet **Vercel**, connecter le dépôt Git (GitHub), brancher le domaine `les2palmiers.site` (ajuster le DNS chez le registrar / l'hébergeur — **confirmer qui gère la zone**).
- [ ] Dépôt sous Git + remote, `.gitignore` complet, `.env.local` gitignoré ; renseigner `.env.example`.
- [ ] Installer la CLI Supabase, initialiser `supabase/` (`config.toml`, migration vide), activer les extensions (`pgcrypto`, `pg_cron`, `pgvector`, `btree_gist`).
- [ ] Nouveau projet **Next.js 16** propre (App Router, TS strict, Tailwind 4) — voir `AGENTS.md` / `node_modules/next/dist/docs/`.
- [ ] Récupérer de l'archive vitrine : tokens (`globals.css`), polices, textes, composants `hero`/`reveal`/`magnetic`/`nav`/`footer` (voir [REFERENCE-VITRINE.md](REFERENCE-VITRINE.md)). Utiliser `les2palmiers.site` (pas `.com`).
- [ ] Dépendances : `@supabase/supabase-js`, `@supabase/ssr`, `@tanstack/react-query`, `react-hook-form`, `zod`, `@serwist/next`.
- [ ] CI GitHub Actions : lint, typecheck, test, `supabase db push`, `supabase functions deploy`.
- [ ] Squelette de routes : `(marketing)`, `(client)/app`, `staff`, `admin`, `auth`.
- [ ] Créer `docs/SETUP.md` (fait) et `docs/COMPTES-DEMO.md` (au moment du seed).

## Phase 1 — Socle données & auth
- [ ] Migrations : `profiles`, `roles`, `user_roles`, `permissions`, `role_permissions` + `has_role()` / `has_permission()` + trigger `handle_new_user` (rôle `client` par défaut).
- [ ] Supabase Auth **e-mail + mot de passe** : inscription, connexion, reset par e-mail. Pas de SMS.
- [ ] Middleware Next.js : protection `/app`, `/staff`, `/admin` + redirection selon rôle.
- [ ] Page compte client (profil, téléphone non vérifié, langue, préférences de notif, suppression de compte).
- [ ] RLS de base + **tests d'accès par rôle** (Vitest + client Supabase).
- [ ] 2FA TOTP (optionnelle, activable admin) — peut être différée.

## Phase 2 — AI Gateway (couche multi-fournisseurs)
> Placée tôt : c'est une brique transverse, et le mode `echo` débloque les démos sans dépendre d'une clé.
- [ ] `supabase/functions/_shared/ai` : interface `AiProvider`, normalisation entrée/sortie/erreurs, fabrique `getProvider(name)`.
- [ ] Adaptateurs : `echo` (mock), `openai-compatible` (Groq/OpenRouter/Ollama), `anthropic`. Autres (`openai`, `google`, `mistral`) au besoin.
- [ ] Adaptateur d'embeddings `embed()`.
- [ ] Tables `ai_settings`, `ai_threads`, `ai_messages`, `ai_usage`.
- [ ] Variables d'env (`AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`, `AI_BASE_URL`, `AI_FALLBACK_*`) documentées dans `.env.example`.

## Phase 3 — Vitrine + PWA + légal
- [ ] Contenu en base (`apartments`, `apartment_media`, `apartment_amenities`, `services`, `service_categories`, `destinations`, `pages`) + fallback statique.
- [ ] Pages vitrine : accueil, appartement (galerie photos/vidéos), services, à propos, contact.
- [ ] Pages légales (CGU/CGV, confidentialité, cookies, mentions) éditables via `pages`.
- [ ] Bandeau de consentement cookies + chargement conditionnel de l'analytics.
- [ ] PWA : `manifest.webmanifest`, service worker Serwist, offline vitrine, invite d'installation.
- [ ] SEO : sitemap, robots, `LodgingBusiness`, OG images. ISR + revalidation à la demande.

## Phase 4 — Appartement, disponibilités, tarification
- [ ] Migrations : `price_rules`, `availability_blocks` + contrainte d'exclusion GiST partagée avec `reservations`.
- [ ] Fonctions SQL `is_available()`, `quote_stay()`.
- [ ] UI staff/admin : calendrier partagé temps réel, blocages, prix par période, remise long séjour.
- [ ] UI publique : recherche par dates + voyageurs → disponibilité + devis détaillé.

## Phase 5 — Réservation
- [ ] Migrations : `reservations`, `reservation_events`.
- [ ] RPC `create_reservation()` transactionnelle (re-check dispo + prix figés + anti-surbooking).
- [ ] Tunnel client : récap, acompte configurable, statuts, historique.
- [ ] `pg_cron` : expiration des `pending_payment`.
- [ ] E-mails de confirmation (Resend, ou mode « log » en démo).

## Phase 6 — Paiement simulé
- [ ] Interface `PaymentProvider` + adaptateur `sim`. Variable `PAYMENTS_PROVIDER=sim`.
- [ ] Edge Function `payments-sim` : `init` + `resolve` (= webhook), signature, idempotence.
- [ ] Migrations : `payments`, `refunds`.
- [ ] Écran de simulation (méthode MTN/Moov/Celtis/carte, boutons succès/échec/attente, marqué « Démonstration »).
- [ ] Reçu PDF (Edge Function `reports`), bucket `reports`.
- [ ] Rapprochement paiement ↔ réservation/commande, remboursement simulé.

## Phase 7 — Services additionnels
- [ ] Migrations : `services` (complété), `service_orders`, `service_order_events`, `providers`.
- [ ] UI client : catalogue, commande (options dynamiques via `options_schema` + Zod), suivi de statut, paiement `prepaid`/`on_delivery`.
- [ ] Prix `fixed` / `quote` / `metered` ; rattachement optionnel à une réservation ; respect du `lead_time_hours`.

## Phase 8 — Messagerie & notifications
- [ ] Migrations : `conversations`, `messages`, `message_reads`, `canned_responses`, `notifications`, `push_subscriptions`.
- [ ] Supabase Realtime (messages, indicateur « écrit… », files staff, cloche).
- [ ] Pièces jointes (bucket privé, URL signées).
- [ ] Edge Function `notify` (in-app + e-mail + push VAPID ; WhatsApp prévu, hors démo).
- [ ] File d'attente offline (Background Sync) pour l'envoi de messages.
- [ ] Messages `system` sur transitions d'état.

## Phase 9 — Espace staff
- [ ] Dashboard opérationnel (arrivées/départs du jour, file des demandes, messages non lus) — temps réel.
- [ ] Réservations : liste, détail, statuts, check-in/out, modifications tracées et notifiées.
- [ ] Demandes de services : accepter/refuser (motif), prix (`quote`), planning, affectation prestataire, clôture.
- [ ] Fiches clients (sans données de paiement brutes), notes internes.
- [ ] Gestion appartement/disponibilités/catalogue **selon permissions**.
- [ ] Modèles de réponses, verrou optimiste anti-conflit.

## Phase 10 — Espace admin
- [ ] Vues : `v_revenue_daily`, `v_occupancy_monthly`, `v_service_performance`, `v_staff_activity`, `v_pending_queue` (MATERIALIZED + `pg_cron`).
- [ ] Dashboard KPIs + graphiques par période (skill `dataviz`).
- [ ] Gestion équipe & matrice de permissions (+ garde-fou dernier admin).
- [ ] Paiements : liste, remboursements, config simulateur.
- [ ] Rapports : génération sur période, export PDF/CSV (`reports`), envoi programmé (`pg_cron` + `notify`).
- [ ] Paramètres entreprise & textes légaux (`site_settings`).

## Phase 11 — Assistant IA (fonctionnel)
- [ ] Edge Function `ai-assistant` : auth, contexte par rôle, streaming SSE, garde-fous, quotas/budget.
- [ ] Widget chat client + historique + actions proposées.
- [ ] Outils : `check_availability`, `list_my_reservations`, `draft_service_order`, `draft_message`.
- [ ] `kb_articles` + `pgvector` + seed (FAQ, procédures, tourisme) + `search_kb`.
- [ ] Mode staff (dossier, file, procédures) ; mode admin (KPI en langage naturel, synthèses).
- [ ] Repli fournisseur en cascade + coupe-circuit budget.
- [ ] Config admin `/admin/assistant` (fournisseur, modèle, prompts, quotas, activation par espace).

## Phase 12 — Audit, durcissement, données de démo
- [ ] `audit_log` append-only + triggers + `REVOKE` + UI `/admin/audit`.
- [ ] Rate-limiting auth / paiement / IA ; en-têtes de sécurité (CSP, HSTS).
- [ ] Revue RLS complète ; tests e2e Playwright (réservation, paiement simulé, message, assistant).
- [ ] `supabase/seed.sql` complet + `npm run db:reset` + `docs/COMPTES-DEMO.md`.
- [ ] Registre de traitement (APDP Bénin) — document.

## Post-démo / mise en production
- 2ᵉ projet Supabase « prod », PITR, retrait du seed de démo.
- Adaptateur paiement réel (FedaPay/KkiaPay), compte marchand.
- OTP téléphone si nécessaire ; WhatsApp Cloud API.
- Comptes prestataires dédiés (app mission).
- Multi-appartements à grande échelle, iCal, fidélité/parrainage/avis, export comptable.
- App mobile native si la PWA ne suffit pas.
