# État des lieux

> Version 0.2 — 2026-09-08.

## 1. Le dossier de préparation (`Desktop/les-2-palmiers/`)

**Ne contient que de la documentation.** Tout le code a été retiré. Contenu actuel :

```
les-2-palmiers/
├── README.md
├── SPEC.md                     # cahier des charges maître
├── FONCTIONNALITES.md          # description exhaustive des fonctionnalités + gestion
├── .env.example                # toutes les variables d'environnement nécessaires
├── .gitignore
└── docs/
    ├── ARCHITECTURE.md
    ├── MODELE-DONNEES.md
    ├── ASSISTANT-IA.md
    ├── ROADMAP.md
    ├── SETUP.md
    ├── ETAT-DES-LIEUX.md
    └── REFERENCE-VITRINE.md
```

## 2. L'ancienne vitrine (archivée)

Le site vitrine Next.js qui se trouvait dans ce dossier a été **déplacé** (rien supprimé) vers :

```
Desktop/les-2-palmiers-archive-vitrine/
```

C'est un one-page **Next.js 16.3.2 / React 19 / Tailwind 4** (`motion`, `lenis`, `lucide-react`), soigné visuellement, **sans backend, sans auth, sans PWA**, contenu en dur dans `src/lib/data.ts`.

Ce qu'on en garde (figé dans [REFERENCE-VITRINE.md](REFERENCE-VITRINE.md)) : la **direction visuelle** (palette `ink`/`paper`/`palm`/`gold`/`sand`, polices Instrument Sans/Serif, effet grain), **tous les textes déjà rédigés**, la **liste des 10 services + 6 destinations**, et les **composants** réutilisables (`hero`, `reveal`, `magnetic`, `nav`, `footer`…).

> On peut supprimer `les-2-palmiers-archive-vitrine/` une fois les éléments repris, ou la garder comme référence.

## 3. Décisions prises (session du 2026-09-08)

| Sujet | Décision |
|---|---|
| Nature | Projet **démonstratif** |
| Frontend | **Vercel** |
| Backend | **Supabase**, **un seul projet** |
| Paiement | **Simulé** (`payments-sim`), interface prête pour FedaPay/KkiaPay |
| Auth | **E-mail + mot de passe** (pas de SMS/OTP) ; téléphone = champ non vérifié |
| Assistant IA | **Couche multi-fournisseurs** (Claude / OpenAI / Gemini / Mistral / API compatible / mock), choix par variable d'env |
| i18n | FR par défaut, structure prête, EN plus tard |
| Région Supabase | eu-west |

## 4. Points encore à confirmer

- **Qui gère la zone DNS de `les2palmiers.site`** (registrar ou hébergeur actuel) — nécessaire pour pointer vers Vercel.
- Mots de passe des comptes de démo (à fixer dans `docs/COMPTES-DEMO.md` au moment du seed).
- Fournisseur d'IA cible pour la démo publique (ou rester en `echo`).
- Envoi d'e-mails réels en démo (`resend`) ou mode `log`.

## 5. Prochaine action

Suivre [docs/SETUP.md](SETUP.md) (Phase 0 de la [Roadmap](ROADMAP.md)) : Git + remote, projet Supabase, projet Vercel, `create-next-app` par-dessus les docs, reprise des éléments de l'archive.
