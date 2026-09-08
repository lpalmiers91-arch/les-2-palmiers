# Les 2 Palmiers – Appartement de Rêve

Préparation d'une solution numérique (PWA) pour **Les 2 Palmiers – Appartement de Rêve**, marque d'hébergement et de services premium à Cotonou (Bénin) : site vitrine + espace client (réservation, services, paiement, messagerie) + espace staff + espace administrateur + assistant IA.

**Domaine** : [les2palmiers.site](https://les2palmiers.site) · **Nature** : projet démonstratif (paiement simulé, auth e-mail/mot de passe, un projet Supabase, assistant IA à fournisseur interchangeable).

> Ce dossier ne contient **que la documentation de préparation**. Le code de l'ancienne vitrine est archivé dans `../les-2-palmiers-archive-vitrine/`.

## Documentation

| Document | Contenu |
|---|---|
| [SPEC.md](SPEC.md) | Cahier des charges maître : vision, périmètre, personas, parcours, fonctionnalités par espace, cookies/RGPD, critères d'acceptation |
| [FONCTIONNALITES.md](FONCTIONNALITES.md) | **Description exhaustive de chaque fonctionnalité et de sa gestion** (données, autorisations, temps réel, cas limites) |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, Vercel + Supabase, environnements, arborescence, auth, paiement simulé, PWA, sécurité, CI/CD, décisions |
| [docs/MODELE-DONNEES.md](docs/MODELE-DONNEES.md) | Schéma Postgres/Supabase, tables, RLS, buckets Storage, vues du dashboard, tables IA |
| [docs/ASSISTANT-IA.md](docs/ASSISTANT-IA.md) | Assistant IA multi-rôle **et multi-fournisseurs** : couche d'abstraction, adaptateurs, outils, garde-fous |
| [docs/ROADMAP.md](docs/ROADMAP.md) | Plan de livraison en 12 phases (dev solo) |
| [docs/SETUP.md](docs/SETUP.md) | Préparation de l'environnement pas à pas (comptes, Git, Supabase, Vercel, domaine) |
| [docs/ETAT-DES-LIEUX.md](docs/ETAT-DES-LIEUX.md) | Contenu actuel du dossier, archive de la vitrine, décisions, points à confirmer |
| [docs/REFERENCE-VITRINE.md](docs/REFERENCE-VITRINE.md) | Design, textes et composants de la vitrine existante à réutiliser |
| [.env.example](.env.example) | Toutes les variables d'environnement nécessaires |

## Stack cible

Next.js 16 (App Router, PWA) sur **Vercel** · **Supabase** (Postgres + Auth + Storage + Realtime + Edge Functions) · paiement **simulé** (interface prête pour Mobile Money MTN/Moov/Celtis) · assistant IA à **fournisseur interchangeable** (Claude / OpenAI / Gemini / Mistral / local / mock).

## Démarrer

Suivre [docs/SETUP.md](docs/SETUP.md), puis la [Roadmap](docs/ROADMAP.md).
