# Préparation de l'environnement — pas à pas

> Lié à [ARCHITECTURE.md](ARCHITECTURE.md) et [ROADMAP.md](ROADMAP.md#phase-0--préparation-de-lenvironnement). Version 0.1 — 2026-09-08.
> But : partir de ce dossier (spec only) et arriver à un dépôt prêt à coder.

## 0. Ce dossier aujourd'hui

`Desktop/les-2-palmiers/` ne contient **que de la documentation** (spec, docs, `.env.example`). Le code de l'ancienne vitrine a été déplacé dans `Desktop/les-2-palmiers-archive-vitrine/` (conservé pour réutilisation, voir [REFERENCE-VITRINE.md](REFERENCE-VITRINE.md)).

## 1. Comptes & accès à obtenir

| Service | Pourquoi | Notes |
|---|---|---|
| **GitHub** | dépôt + CI | repo privé `les-2-palmiers` |
| **Vercel** | hébergement frontend | connecter le repo GitHub ; plan Hobby |
| **Supabase** | backend (un seul projet) | région **eu-west** ; noter URL, anon key, service_role key, JWT secret, DB URL |
| **Registrar / hébergeur de `les2palmiers.site`** | pointer le domaine vers Vercel | **confirmer qui gère la zone DNS** ; garder le cPanel pour les e-mails |
| Fournisseur d'IA (optionnel au début) | assistant réel | commencer en `AI_PROVIDER=echo`, brancher plus tard |
| Resend (optionnel) | e-mails réels | sinon `EMAIL_PROVIDER=log` |

## 2. Outils locaux

```bash
node -v            # >= 20
npm i -g supabase  # CLI Supabase
```

## 3. Créer le dépôt

```bash
cd C:/Users/USER/Desktop/les-2-palmiers
git init
git add .
git commit -m "docs: cahier des charges et préparation de l'environnement"
gh repo create les-2-palmiers --private --source . --push
```

## 4. Initialiser le projet Next.js (par-dessus les docs)

```bash
# à la racine du dossier les-2-palmiers, en gardant SPEC.md / docs / .env.example
npx create-next-app@latest . --typescript --app --tailwind --eslint --src-dir --no-import-alias
```

Puis :
```bash
npm i @supabase/supabase-js @supabase/ssr @tanstack/react-query react-hook-form zod @serwist/next
```

Reprendre de l'archive (`../les-2-palmiers-archive-vitrine/`) : `src/app/globals.css` (tokens), la config des polices dans `layout.tsx`, et les composants `components/{hero,nav,footer,reveal,magnetic,services,tourism,contact,logo-mark,smooth-scroll}.tsx`. **Remplacer `les2palmiers.com` par `les2palmiers.site`.**

## 5. Initialiser Supabase

```bash
supabase init
supabase link --project-ref <ref-du-projet>
```

Première migration — activer les extensions :
```sql
create extension if not exists pgcrypto;
create extension if not exists btree_gist;   -- contrainte d'exclusion réservations
create extension if not exists pg_cron;      -- jobs (expiration, rapports)
create extension if not exists vector;       -- base de connaissances IA
```

Structure des fonctions :
```
supabase/functions/
  _shared/ai/          # AI Gateway (interface + adaptateurs)
  payments-sim/
  ai-assistant/
  notify/
  reports/
```

## 6. Variables d'environnement

```bash
cp .env.example .env.local   # remplir les valeurs Supabase ; laisser AI_PROVIDER=echo au début
```

- Frontend : reporter les `NEXT_PUBLIC_*` + secrets dans **Vercel → Settings → Environment Variables**.
- Edge Functions : `supabase secrets set AI_API_KEY=... PAYMENTS_WEBHOOK_SECRET=...` etc.
- Ne **jamais** committer `.env.local`.

## 7. CI (GitHub Actions)

`.github/workflows/ci.yml` : `npm ci` → `lint` → `typecheck` → `test`.
`.github/workflows/deploy.yml` (sur `main`) : `supabase db push` → `supabase functions deploy` → Vercel déploie automatiquement via l'intégration Git.

## 8. Domaine — `les2palmiers.site` (géré chez Hostinger)

Le domaine est enregistré et ses DNS sont gérés dans **Hostinger → hPanel**. Claude n'a **pas** d'accès à Hostinger (aucune intégration) — cette étape est manuelle, ~2 min, une seule fois, au moment du 1ᵉʳ déploiement Vercel.

**Méthode retenue : garder les DNS chez Hostinger, ajouter 2 enregistrements** (on ne change PAS les nameservers, pour ne pas déplacer l'e-mail).

1. Vercel → projet `les-2-palmiers` → **Settings → Domains** → ajouter `les2palmiers.site` **et** `www.les2palmiers.site`. Vercel affiche les valeurs exactes à créer.
2. Hostinger → hPanel → **Domaines → `les2palmiers.site` → DNS / Nameservers → Gérer les enregistrements DNS** :
   - `A` · hôte `@` · valeur **`76.76.21.21`** (IP Vercel — à confirmer avec ce qu'affiche Vercel)
   - `CNAME` · hôte `www` · valeur **`cname.vercel-dns.com`**
   - supprimer un éventuel `A`/`CNAME` `@` ou `www` préexistant qui pointe vers l'hébergement Hostinger
3. **Ne pas toucher** aux enregistrements `MX` ni aux `TXT` de type SPF/DKIM → l'e-mail `@les2palmiers.site` continue de fonctionner chez Hostinger.
4. Propagation : quelques minutes à quelques heures. Vercel émet le certificat HTTPS automatiquement.

> À confirmer : utilises-tu une **boîte e-mail `@les2palmiers.site` chez Hostinger** ? Si oui, on garde bien la méthode « 2 enregistrements » ci-dessus (jamais le changement de nameservers).

## 9. Vérification « prêt à coder »

- [ ] `npm run dev` sert la page d'accueil sur `http://127.0.0.1:3000`.
- [ ] Le client Supabase se connecte (une requête simple passe).
- [ ] `supabase db push` applique une migration vide sans erreur.
- [ ] Une Edge Function `echo` déployée répond.
- [ ] Le déploiement Vercel de la branche `main` est vert.
- [ ] `les2palmiers.site` résout vers Vercel.

## 10. Ensuite

Suivre [ROADMAP.md](ROADMAP.md) à partir de la Phase 1.
