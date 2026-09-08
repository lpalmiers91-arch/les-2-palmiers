# Architecture technique

> Lié à [SPEC.md](../SPEC.md). Version 0.2 — 2026-09-08.
> **Contexte : projet à but démonstratif.** On prépare un environnement complet et réaliste, mais le paiement est **simulé** et le périmètre d'infra reste léger (un seul projet Supabase). L'architecture est conçue pour passer en production sans réécriture majeure.

## 1. Vue d'ensemble

Application web unique, installable (PWA), à trois espaces (client, staff, admin) servis par le même frontend **Next.js sur Vercel**, adossée à un backend **Supabase** (Postgres + Auth + Storage + Realtime + Edge Functions).

```
                     ┌───────────────────────────────┐
   Navigateur /  ───▶ │  Next.js 16 (App Router, PWA) │  → déployé sur Vercel
   PWA installée      │  - vitrine (public)           │     domaine les2palmiers.site
                      │  - /app   espace client       │
                      │  - /staff espace employé      │
                      │  - /admin espace admin        │
                      └──────────────┬────────────────┘
                                     │ @supabase/supabase-js (RLS)
                      ┌──────────────▼────────────────┐
                      │            Supabase           │  (un seul projet)
                      │  Postgres + RLS               │
                      │  Auth (email + mot de passe)  │
                      │  Storage (photos, vidéos)     │
                      │  Realtime (messagerie, files) │
                      │  Edge Functions:              │
                      │   - payments-sim (simulateur) │
                      │   - ai-assistant (multi-IA)   │
                      │   - notify (email + push)     │
                      │   - reports (génération)      │
                      └───┬───────────────┬───────────┘
                          │               │
              ┌───────────▼──┐   ┌────────▼─────────────────────┐
              │ Service       │   │  AI Gateway (couche neutre)  │
              │ e-mail        │   │  Claude / OpenAI / Gemini /  │
              │ (Resend/SMTP) │   │  Mistral / local / mock…     │
              └───────────────┘   └──────────────────────────────┘
```

## 2. Stack

| Couche | Choix | Notes |
|---|---|---|
| Framework | **Next.js 16** (App Router, RSC), React 19 | nouveau projet propre (l'ancienne vitrine est archivée hors du dossier). Lire `node_modules/next/dist/docs/` avant de coder (version à breaking changes). |
| Hébergement front | **Vercel** | confirmé. Domaine `les2palmiers.site` pointé vers Vercel. Offre Hobby suffisante pour la démo. |
| Langage | TypeScript strict | |
| UI | Tailwind CSS v4, `motion`, `lenis` | reprendre les tokens/polices/textes de [REFERENCE-VITRINE.md](REFERENCE-VITRINE.md). |
| Composants | Radix UI ou shadcn/ui | formulaires, dialogues, menus — accessibilité clavier + ARIA. |
| Backend | **Supabase** (un seul projet) | Postgres, Auth, Storage, Realtime, Edge Functions (Deno). |
| Accès données | `@supabase/supabase-js` + `@supabase/ssr` | RLS = source de vérité des autorisations. |
| État serveur (client) | TanStack Query | cache, revalidation, offline. |
| Formulaires | React Hook Form + Zod | schémas Zod partagés client / Edge Functions. |
| **Paiement** | **Simulé** — Edge Function `payments-sim` | aucune intégration d'agrégateur réel. Écrans MTN/Moov/Celtis/carte factices, statut forçable (succès/échec/en attente). Interface prévue pour brancher FedaPay/KkiaPay plus tard sans changer le reste. |
| E-mail transactionnel | Resend (offre gratuite) ou SMTP | confirmations, reçus, rapports. En démo : peut rester en mode « log ». |
| Push | Web Push (VAPID) via service worker | notifications PWA. |
| WhatsApp (option) | Meta Cloud API | hors périmètre démo, prévu dans le modèle. |
| **Assistant IA** | **Couche multi-fournisseurs** (AI Gateway) | Claude, OpenAI, Gemini, Mistral, API compatible OpenAI, ou mock. Choix par variable d'env. Voir [ASSISTANT-IA.md](ASSISTANT-IA.md). |
| PWA | `@serwist/next` | manifeste, service worker, offline, invite d'installation. |
| Analytics | Vercel Analytics ou Plausible | chargé **après** consentement cookies uniquement. |
| Tests | Vitest (unit), Playwright (e2e) | Playwright MCP déjà configuré côté poste. |

## 3. Hébergement — décision

**Retenu : frontend Vercel + backend Supabase.**

- Le frontend Next.js est déployé sur **Vercel** (SSR/ISR, Server Actions, previews de branche).
- Le domaine `les2palmiers.site` pointe vers Vercel (enregistrements DNS à ajuster chez le registrar / l'hébergeur actuel).
- L'**hébergement mutualisé cPanel existant** n'héberge pas l'app ; il peut servir aux **boîtes e-mail `@les2palmiers.site`** et à une éventuelle redirection.
- Toute la logique métier et les données sont sur **Supabase**.

> Règle de conception conservée : **aucune logique critique uniquement dans une Server Action Next.js**. Paiement (simulé), IA, notifications, rapports = **Edge Functions Supabase**, appelables depuis n'importe quel frontend. Cela garde ouverte l'option d'un repli (export statique) et évite le verrouillage sur Vercel.

## 4. Environnements — **un seul projet Supabase**

Vu le but démonstratif et l'absence de paiements réels, **un seul projet Supabase** suffit (comme MenuKR). Pas d'isolation dev/prod au niveau infrastructure.

| Env | Frontend | Supabase | Données |
|---|---|---|---|
| `local` | `next dev` sur 127.0.0.1 | le projet Supabase partagé (ou `supabase start` en local) | jeu de démo (seed) |
| `preview` | déploiements de branche Vercel | même projet Supabase | jeu de démo |
| `production` (démo publique) | `les2palmiers.site` | même projet Supabase | jeu de démo |

- Séparation logique par un champ `env` ou simplement par le jeu de données de démonstration.
- **Comptes de démonstration pré-créés** (voir seed) : un client, un staff, un admin, avec mots de passe connus documentés dans `docs/COMPTES-DEMO.md` (à créer au moment du seed).
- Sauvegardes : PITR non requis en démo ; garder le `seed.sql` reproductible = la vraie « sauvegarde ».
- **Passage en prod plus tard** : créer un 2ᵉ projet Supabase « prod », rejouer les migrations, retirer le seed de démo, activer PITR. Rien dans le code ne dépend d'un projet unique.

## 5. Arborescence cible du dépôt

```
les-2-palmiers/
├── SPEC.md
├── FONCTIONNALITES.md            # description exhaustive des fonctionnalités + gestion
├── docs/
│   ├── ARCHITECTURE.md
│   ├── MODELE-DONNEES.md
│   ├── ASSISTANT-IA.md
│   ├── ROADMAP.md
│   ├── SETUP.md                  # préparation de l'environnement pas à pas
│   ├── ETAT-DES-LIEUX.md
│   └── REFERENCE-VITRINE.md
├── .env.example                  # toutes les variables nécessaires
├── src/
│   ├── app/
│   │   ├── (marketing)/          # vitrine publique
│   │   │   ├── page.tsx · appartement/ · services/ · a-propos/
│   │   │   └── legal/            # cgu, confidentialite, cookies, mentions
│   │   ├── (client)/app/         # espace client (auth requise)
│   │   │   ├── reserver/ · reservations/ · services/ · messages/
│   │   │   ├── paiements/ · notifications/ · compte/
│   │   ├── staff/                # espace employé (rôle staff/coordinator)
│   │   │   ├── page.tsx · reservations/ · demandes/ · clients/
│   │   │   ├── messages/ · appartements/ · catalogue/
│   │   ├── admin/                # espace admin
│   │   │   ├── page.tsx (dashboard) · statistiques/ · equipe/
│   │   │   ├── appartements/ · disponibilites/ · paiements/
│   │   │   ├── rapports/ · audit/ · parametres/ · assistant/
│   │   ├── auth/                 # login, register, reset
│   │   └── api/                  # routes minimales
│   ├── components/               # UI partagée (reprise de l'archive)
│   ├── features/                 # logique par domaine
│   │   ├── reservations/ · services/ · payments/ · messaging/
│   │   ├── notifications/ · ai/ · analytics/ · audit/
│   ├── lib/
│   │   ├── supabase/             # clients browser/server + types générés
│   │   ├── validation/           # schémas Zod partagés
│   │   └── i18n/
│   └── styles/
├── supabase/
│   ├── migrations/               # SQL versionné
│   ├── functions/
│   │   ├── _shared/ai/           # AI Gateway : interface + adaptateurs
│   │   ├── payments-sim/
│   │   ├── ai-assistant/
│   │   ├── notify/
│   │   └── reports/
│   ├── seed.sql                  # appartement + services + destinations + comptes démo
│   └── config.toml
├── public/
│   ├── manifest.webmanifest
│   └── icons/
└── .github/workflows/            # CI: lint, typecheck, test, migrations, deploy
```

## 6. Authentification & autorisation

- **Supabase Auth : email + mot de passe uniquement.** Réinitialisation par e-mail. Lien magique (magic link) optionnel.
- **Pas d'OTP SMS** (coût + complexité inutiles pour une démo). Le **téléphone est un simple champ de profil**, non vérifié.
- OAuth Google : optionnel, désactivé par défaut.
- **2FA (TOTP)** : optionnelle, recommandée pour `admin` ; activable plus tard sans changement de schéma.
- Tables : `profiles` (1-1 avec `auth.users`), `roles`, `user_roles` (multi-rôles), `permissions`, `role_permissions`.
- Fonction Postgres `has_permission(uid, key)` / `has_role(uid, role)` utilisées dans les policies RLS.
- Le frontend lit les rôles depuis le JWT (custom claims via hook d'auth) pour le routage/affichage ; **la base reste seule juge** (RLS).
- Sessions staff/admin : durée raisonnable, refresh, déconnexion après inactivité prolongée.

### Comptes de démonstration (créés par le seed)
| Rôle | E-mail | Mot de passe |
|---|---|---|
| Client | `client@les2palmiers.site` | *(défini dans `docs/COMPTES-DEMO.md`)* |
| Staff | `staff@les2palmiers.site` | *(idem)* |
| Admin | `admin@les2palmiers.site` | *(idem)* |

> Convention alignée sur les autres projets (cf. staff MenuKR `TestPass123!`).

## 7. Paiement — **simulé**

Aucune intégration d'agrégateur réel. Objectif : montrer le **parcours complet** (choix méthode → « paiement » → confirmation → reçu → statut) de façon crédible.

### Flux simulé
1. Le client valide une réservation/commande → le frontend appelle l'Edge Function `payments-sim` (montant, référence interne, méthode `mtn`/`moov`/`celtis`/`card`).
2. `payments-sim` crée une transaction `pending` en base et renvoie un « écran de paiement » factice.
3. Écran de simulation : boutons **« Confirmer le paiement »**, **« Simuler un échec »**, **« Simuler une attente »** (+ éventuel délai artificiel).
4. Le choix appelle un endpoint qui met la transaction à `paid` / `failed` / laisse `pending`, exactement comme le ferait un vrai webhook.
5. À `paid` : la réservation/commande passe `confirmée`, une notification part, un reçu PDF est généré.
6. Idempotence et machine à états **identiques** à une intégration réelle.

### Bascule vers un vrai paiement (plus tard)
- Même contrat d'Edge Function ; on ajoute un adaptateur `providers/fedapay.ts` ou `kkiapay.ts` derrière une interface `PaymentProvider { init(), verifyWebhook(), refund() }`.
- Variable `PAYMENTS_PROVIDER=sim|fedapay|kkiapay`. Le reste de l'app ne change pas.

### Anti double-réservation (réel, même en démo)
Contrainte d'exclusion Postgres (`EXCLUDE USING gist`) sur `(apartment_id, daterange)` pour les réservations non annulées + verrou transactionnel à la création.

## 8. Messagerie & temps réel

- Tables `conversations`, `messages`, `message_reads`.
- **Supabase Realtime** (Postgres changes / broadcast) pour la livraison instantanée.
- Pièces jointes : bucket Storage privé, URL signées.
- Trigger sur `messages` → insertion dans `notifications` → Realtime + Edge Function `notify` (email/push selon préférences).

## 9. PWA & offline

- `manifest.webmanifest` : nom, icônes (maskable), thème `#22392c`, `display: standalone`, `start_url: /`.
- Service worker (Serwist) : pré-cache de la coquille + pages vitrines ; runtime cache stale-while-revalidate pour les images ; NetworkFirst pour les données Supabase avec repli cache.
- File d'attente hors-ligne (Background Sync) pour l'envoi de messages.
- Invite d'installation personnalisée après une interaction significative.

## 10. Sécurité (rappels, applicables même en démo)

- RLS activée sur **toutes** les tables, testée (tests d'accès par rôle).
- Secrets uniquement dans les variables d'environnement Vercel / Supabase, jamais dans le dépôt (`.env.local` gitignoré). `.env.example` liste les clés sans valeur.
- Vérification de signature sur les webhooks (y compris le webhook simulé).
- Rate-limiting sur `auth`, `payments-sim`, `ai-assistant`.
- Journal d'audit : table `audit_log` append-only, écriture par triggers `AFTER` ; `REVOKE UPDATE/DELETE` pour les rôles applicatifs.
- En-têtes de sécurité (CSP, HSTS, X-Frame-Options) via `next.config` / middleware.
- Données de démo uniquement : pas de vraie PII, pas de vrais moyens de paiement.

## 11. CI/CD

- **GitHub Actions** : `lint` + `typecheck` + `test` sur chaque PR ; `supabase db push` (migrations) + `supabase functions deploy` sur merge vers `main` ; déploiement Vercel automatique.
- Génération des types TypeScript Supabase (`supabase gen types`) vérifiée en CI.
- Playwright e2e sur les parcours critiques (réservation, paiement simulé, message, assistant).

## 12. Décisions

| Sujet | Décision |
|---|---|
| Hébergement front | **Vercel** ✅ |
| Backend | **Supabase, un seul projet** ✅ (2ᵉ projet « prod » seulement si mise en production réelle) |
| Paiement | **Simulé** (`payments-sim`) ✅ — interface prête pour FedaPay/KkiaPay plus tard |
| Authentification | **E-mail + mot de passe**, pas d'OTP SMS ✅ — téléphone = champ profil non vérifié |
| Assistant IA | **Couche multi-fournisseurs**, choix par variable d'env, mock inclus ✅ |
| i18n | Français par défaut, structure i18n en place, anglais plus tard |
| Région Supabase | `eu-west` (proximité RGPD/APDP) |
| DNS `les2palmiers.site` | à pointer vers Vercel — **qui gère la zone DNS ? à confirmer** |
| Domaine dans le code | utiliser `les2palmiers.site` (l'archive contient `les2palmiers.com` — erreur à ne pas reproduire) |
