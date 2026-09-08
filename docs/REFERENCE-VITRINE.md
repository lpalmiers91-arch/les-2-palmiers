# Référence — vitrine existante (design + contenu)

> Version 0.2 — 2026-09-08. Le code de la vitrine Next.js a été **sorti** du dossier de préparation vers `Desktop/les-2-palmiers-archive-vitrine/` (rien à supprimer, tout est conservé là). Ce document fige ce qui vaut la peine d'être repris quand on (re)construira l'interface : c'est la **direction visuelle validée** et les **textes déjà écrits**.

## 1. Direction visuelle

- **Ton** : hébergement premium, chaleureux, éditorial (magazine), beaucoup d'espace, animations discrètes.
- **Ambiance** : « palmier », terre du Bénin — vert profond + or + papier crème.
- Effet **grain** léger (bruit SVG, `opacity ~0.05`, `mix-blend-mode: overlay`).
- Animations : `motion` (Framer Motion) + smooth-scroll `lenis`. Révélations au scroll, spotlight au survol du hero, effet magnétique sur les boutons.

## 2. Jetons de design (tokens)

Palette (de `globals.css`) :

| Rôle | Variable | Valeur |
|---|---|---|
| Encre (texte, fonds sombres) | `--color-ink` | `#15160f` |
| Encre douce | `--color-ink-soft` | `#1e2016` |
| Papier (fond clair) | `--color-paper` | `#f8f5ec` |
| Papier atténué | `--color-paper-dim` | `#efe9d8` |
| Palmier (vert primaire) | `--color-palm` | `#22392c` |
| Palmier clair | `--color-palm-light` | `#3b5943` |
| Or (accent) | `--color-gold` | `#b6903f` |
| Or clair | `--color-gold-light` | `#ddb96a` |
| Sable (labels) | `--color-sand` | `#c9c0a4` |
| Filet sombre | `--color-line-dark` | `rgba(248,245,236,0.14)` |
| Filet clair | `--color-line-light` | `rgba(21,22,15,0.1)` |

Typographie :

| Usage | Police | Poids |
|---|---|---|
| Corps / UI (`--font-sans`) | **Instrument Sans** | 400 / 500 / 600 |
| Titres editoriaux, italiques (`--font-serif`) | **Instrument Serif** | 400, normal + italic |

- Titres : `tracking-[-0.01em]`, `text-balance`, `font-feature-settings: "ss01" 1, "liga" 1`.
- Accents : phrases en **serif italic or clair** au milieu des titres sans-serif.
- Labels de section : `text-[12px] uppercase tracking-[0.28em]` couleur `sand` ou `palm`, précédés d'un trait `h-px w-8`.
- Rayons : cartes `rounded-2xl` à `rounded-[28px]` ; boutons `rounded-full`.
- Thème PWA suggéré : `#22392c` (palm).

## 3. Textes déjà rédigés (à réutiliser)

- **Baseline** : « Profitez pleinement de votre temps… nous nous occupons du reste. »
- **Sur-titre hero** : « Appartement de rêve — Bénin »
- **H1 hero** : « Profitez pleinement de votre temps. » + (serif italic) « Nous nous occupons du reste. »
- **Accroche hero** : « Un appartement d'exception et une dizaine de services pensés pour rendre chaque séjour plus simple, plus confortable et plus inoubliable. »
- **Section services — titre** : « Tout ce dont vous avez besoin, *sans jamais quitter* votre séjour. »
  - sous-texte : « Une dizaine de prestations pensées pour votre confort, livrées directement à votre appartement. »
- **Promesse** : « Notre promesse — Profitez pleinement de votre temps… nous nous occupons du reste. »
- **Section tourisme — titre** : « Séjournez ici, *explorez tout* autour. »
- **Section contact — titre** : « Prêt à profiter de *votre séjour ?* »
  - sous-texte : « Appelez-nous pour réserver l'appartement ou organiser l'un de nos services à domicile. Notre équipe vous répond avec plaisir. »
  - encart : « Un besoin particulier ? Nous adaptons nos services à votre demande — parlez-nous de votre séjour. »
- **Disponibilité** : « Disponible 7j/7 »

## 4. Données de contenu (aujourd'hui en dur → à mettre en base)

**Téléphones** : `01 64 65 63 63`, `01 40 69 55 34` → *à confirmer au format +229*.

**Services** (9 + 1 sur mesure) :

| # | Titre | Description | icône |
|---|---|---|---|
| 01 | Location de voiture | Des véhicules modernes, propres et confortables, pour tous vos déplacements. | `car` |
| 02 | Agents d'entretien | Des professionnels qualifiés pour la propreté, l'ordre et la sécurité de votre appartement. | `spray` |
| 03 | Coiffure & tresses | Des coiffeurs et coiffeuses professionnels se déplacent chez vous, à domicile. | `scissors` |
| 04 | Cuisinier à domicile | Des plats faits maison, préparés selon vos goûts et vos préférences. | `chef` |
| 05 | Pédicure & manucure | Soins professionnels pour des mains et des pieds impeccables. | `hand` |
| 06 | Massage à domicile | Des mains expertes pour votre bien-être et votre relaxation. | `waves` |
| 07 | Recharge & transactions | Recharge MTN, Moov et Celtis, ainsi que des transactions rapides. | `wallet` |
| 08 | Couture à domicile | Des tailleurs professionnels à votre service, où que vous soyez. | `shirt` |
| 09 | Garde d'enfants | Des nounous professionnelles, fiables et disponibles 24h/24. | `baby` |
| 10 | Sur mesure | Un besoin particulier ? Nous adaptons nos services à votre demande. | `sparkles` |

> La description métier cite aussi **soins de beauté** et **découverte touristique** : le tourisme est traité comme une rubrique éditoriale (destinations), pas comme un service commandable en v1.

**Destinations** : Ouidah (Mémoire & patrimoine), Abomey (Palais royaux), Lac Noir (Eaux paisibles), Agouland (Nature préservée), Kpalimé (Collines verdoyantes), Lomé (Vie côtière).

**Stats affichées** : « 10 » Services à domicile · « 6 » Destinations à explorer · « 7j/7 » Disponibilité.

## 5. Inventaire des composants (archive)

`nav`, `hero`, `services` + `service-icon`, `signature`, `tourism`, `contact`, `footer`, `logo-mark`, `magnetic` (effet magnétique), `reveal` / `RevealGroup` / `RevealItem` (révélation au scroll), `smooth-scroll` (lenis).

Stack de l'archive : Next.js 16.3.2, React 19.2.8, Tailwind 4, `motion` 13, `lenis`, `lucide-react`. Métadonnées SEO complètes (`robots.ts`, `sitemap.ts`, `opengraph-image.tsx`, icônes).

> ⚠️ `layout.tsx` de l'archive utilise `les2palmiers.com` — le domaine réel est **`les2palmiers.site`**.

## 6. Ce qu'on en fait

Quand on démarrera le développement (nouveau projet Next.js propre, voir [ROADMAP](ROADMAP.md) Phase 0), on **reprend** : la palette, les polices, l'esprit éditorial, tous les textes ci-dessus, la liste des services/destinations (versés en base), et on peut **récupérer les composants** de l'archive un par un (hero, reveal, magnetic…) plutôt que les réécrire.
