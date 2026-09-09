# Déploiement — Vercel + domaine

> Version 0.1 — 2026-09-09.

## État

- Code : `github.com/lpalmiers91-arch/les-2-palmiers`, branche `main` (privé).
- Backend Supabase, Edge Functions, e-mail : **opérationnels**.
- Frontend : construit et testé en local.

## Étape bloquante : connecter Vercel à GitHub

Le compte Vercel (`ivongbaguidi8-sketch's projects`) n'a pas accès au dépôt privé
`lpalmiers91-arch/les-2-palmiers`. Une des deux options :

**A — installer l'app Vercel sur GitHub** (recommandé, auto-déploiement à chaque push)
1. https://github.com/apps/vercel → **Configure** → compte `lpalmiers91-arch`
2. « Only select repositories » → cocher `les-2-palmiers` → Save
3. Prévenir : je crée alors le projet Vercel et je déploie.

**B — rendre le dépôt public**
`github.com/lpalmiers91-arch/les-2-palmiers` → Settings → General → Danger Zone →
Change visibility → Public. (Aucun secret dans le dépôt — `.env.local` est ignoré.)

## Variables d'environnement Vercel (Production + Preview)

| Clé | Valeur |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://zmobadwgoqcwkryefciq.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(clé anon — depuis `.env.local`)* |
| `NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL` | `https://zmobadwgoqcwkryefciq.supabase.co/functions/v1` |
| `NEXT_PUBLIC_APP_URL` | `https://les2palmiers.site` |

## Après le premier déploiement

1. **Supabase Auth** : `site_url` = URL de production, ajouter l'URL Vercel à `uri_allow_list`.
2. **Edge Function** : `supabase secrets set APP_URL=https://les2palmiers.site` (déjà fait).
3. **Domaine** (Hostinger, via l'API — Claude peut le faire) :
   - remplacer l'enregistrement `A @ 2.57.91.91` par `A @ 76.76.21.21` (Vercel)
   - `CNAME www` → `cname.vercel-dns.com`
   - **ne pas toucher** aux enregistrements Resend (`resend._domainkey`, `send`)
4. Ajouter `les2palmiers.site` + `www` dans Vercel → Settings → Domains.
5. Test de bout en bout sur le domaine.

## Comptes de démonstration

`client@` / `staff@` / `admin@les2palmiers.site` — mot de passe `Demo2026!`.
