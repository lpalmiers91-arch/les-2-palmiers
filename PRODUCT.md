# PRODUCT.md — Les 2 Palmiers

> Contexte produit durable. La vérité produit vit ici ; DESIGN.md porte les décisions visuelles.

## Ce que c'est

**Les 2 Palmiers – Appartement de Rêve** : hébergement meublé haut de gamme + conciergerie et services à domicile, à **Cotonou (Bénin)**. Un appartement d'exception, et autour de lui une offre « tout-en-un » — le client réserve son séjour **et** commande ce dont il a besoin (voiture, ménage, cuisinier, coiffure, massage, garde d'enfants, couture, recharges, découverte touristique, sur-mesure).

Mécanisme unique en une phrase : **un séjour où tout ce dont on a besoin arrive à la porte de l'appartement, orchestré par une seule équipe.**

## Le produit numérique

Une application web installable (PWA), quatre faces :

1. **Vitrine** (public) — présenter l'appartement, les services, le lieu ; déclencher la réservation. *Mode : Persuade.*
2. **Espace client** — réserver, commander des services, payer (simulé), échanger, suivre. *Mode : Operate.*
3. **Espace staff** — traiter réservations et demandes, gérer le catalogue et les disponibilités. *Mode : Operate.*
4. **Espace admin** — piloter : revenus, occupation, équipe, paiements, rapports, audit. *Mode : Operate.*

Transversal : un **assistant IA** (fournisseur interchangeable) qui aide selon le rôle.

## Public

- **Voyageur premium** : diaspora béninoise de retour, cadre en déplacement à Cotonou, touriste exigeant. Réserve souvent depuis un **smartphone Android**, connexion 3G/4G. Veut comprendre vite ce qui est inclus, être rassuré, ne pas avoir à chercher un chauffeur ou un traiteur sur place.
- **Staff** : agent d'accueil, coordinateur services. Traite l'activité du jour sur mobile et sur ordinateur.
- **Propriétaire** : pilote seul, veut des chiffres justes et une équipe cadrée.

## Scène d'usage

Cotonou. Lumière tropicale franche, chaleur, océan proche, terre de latérite, palmiers, murs clairs, laiton. Le client ouvre le site le soir depuis son téléphone pour préparer un séjour ; il y revient pendant le séjour pour commander un dîner ou une voiture.

## Contraintes & partis pris

- **Démonstration** : paiement **simulé** (parcours complet, issue forçable), pas d'agrégateur réel.
- Auth **e-mail + mot de passe** (pas de SMS). Comptes démo : `client@` / `staff@` / `admin@les2palmiers.site` (mdp `Demo2026!`).
- Backend **déjà construit** : Supabase (34 tables, RLS, RPC `quote_stay` / `create_reservation` / `payment_*` / `send_message` / `create_service_order`), 2 Edge Functions (`ai-assistant` SSE multi-fournisseurs, `notify`), e-mail Resend opérationnel (`noreply@les2palmiers.site`).
- **Mobile-first** obligatoire : Android + iPhone, tout responsive, budget perfs strict (LCP < 2,5 s en 4G).
- Français par défaut (structure i18n prête, EN plus tard).
- **Pas d'emoji** nulle part. Icônes dessinées (lucide-react). Favicon réel.
- Devise unique **XOF** (entier, pas de décimales).

## Faits réutilisables

- Baseline : « Profitez pleinement de votre temps… nous nous occupons du reste. »
- Téléphones : `+229 01 64 65 63 63`, `+229 01 40 69 55 34`.
- Appartement : 4 voyageurs, 2 chambres, 2 SdB, Wi-Fi fibre, parking privé, cuisine équipée, clim, salon détente, gardiennage 24h/24. Base 45 000 XOF/nuit, ménage 15 000 XOF, arrivée 14h / départ 11h, annulation modérée.
- 10 services (voir `docs/REFERENCE-VITRINE.md` §4). 6 destinations : Ouidah, Abomey, Lac Noir, Agouland, Kpalimé, Lomé.
- Domaine : `les2palmiers.site` (Hostinger DNS, à pointer vers Vercel).

## Brand commitments

- Monde visuel **hérité** de la vitrine existante (archivée) : vert botanique profond + laiton + neutre chaud, voix éditoriale, texture grain, mouvement discret. Documenté et **fait évoluer** dans DESIGN.md — pas remplacé.
- Rendu cible : **niveau studio / Framer**, esprit Apple (espace, retenue, typo large, mouvement au service du sens).
