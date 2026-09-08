# Les 2 Palmiers – Appartement de Rêve · Cahier des charges

> Document maître. Version 0.2 — 2026-09-08.
> Documents liés : [Fonctionnalités détaillées](FONCTIONNALITES.md) · [Architecture](docs/ARCHITECTURE.md) · [Modèle de données](docs/MODELE-DONNEES.md) · [Assistant IA](docs/ASSISTANT-IA.md) · [Roadmap](docs/ROADMAP.md) · [Setup](docs/SETUP.md) · [État des lieux](docs/ETAT-DES-LIEUX.md) · [Référence vitrine](docs/REFERENCE-VITRINE.md)
>
> **Nature du projet : démonstration.** Environnement complet et réaliste (Vercel + Supabase), mais **paiement simulé**, **auth e-mail/mot de passe** (pas de SMS), **un seul projet Supabase**, **assistant IA à fournisseur interchangeable**. Conçu pour passer en production ensuite sans réécriture majeure.

---

## 1. L'entreprise

**Les 2 Palmiers – Appartement de Rêve** est une marque d'hébergement et de services **premium** basée à **Cotonou (Bénin)**. Elle ne se limite pas à la location d'un appartement meublé : elle vend une **expérience de séjour complète**, sans contraintes, autour d'une logique « tout-en-un ».

- **Hébergement haut de gamme** : appartement équipé (Wi-Fi, parking, cuisine, climatisation, espaces de détente).
- **Conciergerie & services à domicile** : location de voiture, entretien du logement, coiffure & tresses, cuisinier privé, soins de beauté (pédicure/manucure), massages, recharges & transactions Mobile Money, découverte touristique, couture à domicile, garde d'enfants, demandes sur mesure.
- **Positionnement** : un *partenaire de séjour* qui prend en charge une grande partie des besoins quotidiens du client pour qu'il profite pleinement de son temps.

**Domaine** : `les2palmiers.site` · **Téléphones** : `01 64 65 63 63`, `01 40 69 55 34`.

## 2. Objectif du projet

Développer **une solution numérique unique** (application web installable — PWA) qui regroupe :

1. Un **site vitrine** public qui présente l'appartement, les services et la marque.
2. Un **espace client** : réserver, commander des services, payer, échanger, suivre.
3. Un **espace staff** : traiter les réservations et demandes, gérer le catalogue, communiquer.
4. Un **espace administrateur** : pilotage, statistiques, finances, équipe, rapports, audit.
5. Un **assistant IA** transversal qui aide client, staff et propriétaire.

## 3. Périmètre

### Dans le périmètre (v1)
- Site vitrine + consentement cookies + PWA installable.
- Comptes clients (**e-mail + mot de passe**), réservation d'appartement avec calendrier de disponibilités.
- Catalogue de services additionnels et commande de services (liés ou non à une réservation).
- Paiement **simulé** reproduisant le parcours Mobile Money (MTN, Moov, Celtis) + carte, avec statut forçable (succès / échec / attente).
- Messagerie client ↔ entreprise (temps réel).
- Historique des réservations et commandes, notifications (in-app + email, WhatsApp optionnel).
- Back-office staff (rôles & permissions) et back-office admin (dashboard, stats, rapports, journal d'audit).
- Assistant IA (FAQ, aide à la réservation, guidage sur place, aide interne staff/admin) — **fournisseur d'IA interchangeable** (Claude, OpenAI, Gemini, Mistral, modèle local, ou mock), choisi par configuration.

### Hors périmètre (v1, à considérer plus tard)
- Multi-appartements / multi-immeubles à grande échelle (le modèle de données le prévoit, l'UI reste simple).
- Application mobile native (la PWA couvre le besoin).
- Programme de fidélité, parrainage, avis publics vérifiés.
- Facturation comptable / export vers un logiciel de compta.
- Marketplace ouverte à des prestataires tiers en libre-service.

## 4. Personas

| Persona | Description | Besoins clés |
|---|---|---|
| **Voyageur / client** | Touriste, diaspora de retour, professionnel en déplacement à Cotonou. | Trouver et réserver vite, comprendre ce qui est inclus, commander des services, payer en Mobile Money, être rassuré et guidé. |
| **Agent d'accueil / staff opérationnel** | Gère l'arrivée/départ, coordonne les prestataires. | Voir les arrivées du jour, valider/planifier les demandes de services, joindre le client. |
| **Coordinateur services** | Affecte les prestations (chauffeur, ménage, cuisinier…). | File des demandes, planning, statut, relances. |
| **Propriétaire / administrateur** | Pilote l'activité. | Revenus, taux d'occupation, performance des services, gestion de l'équipe et des permissions, rapports. |
| **Prestataire** *(v1 : géré indirectement)* | Chauffeur, coiffeuse, cuisinier… | Recevoir une mission claire (via staff / WhatsApp). Compte dédié en v2. |

## 5. Parcours principaux

### 5.1 Client — réserver un séjour
1. Arrivée sur le site vitrine → « Réserver ».
2. Choix des dates + nombre de voyageurs → l'appartement s'affiche s'il est disponible (photos, vidéos, équipements, prix, règles).
3. Création de compte / connexion (**e-mail + mot de passe**).
4. Récapitulatif : nuits, taxes/frais, acompte ou paiement total.
5. **Paiement simulé** (choix méthode → écran factice → confirmation/échec forçable) → confirmation.
6. Réservation `confirmée` : e-mail + notification, ajout à l'historique, ouverture du fil de messagerie, accès à l'assistant IA « séjour ».

### 5.2 Client — commander un service
1. Depuis une réservation active *ou* depuis la page Services.
2. Choix du service, créneau souhaité, options, adresse (par défaut : l'appartement), note.
3. Devis automatique (prix fixe) ou « sur devis » (le staff propose un montant).
4. Paiement immédiat ou à la prestation selon le service.
5. Suivi du statut : `demandé → accepté → planifié → en cours → terminé` (ou `refusé`/`annulé`).

### 5.3 Staff — traiter une demande de service
1. Notification d'une nouvelle demande dans la file.
2. Vérifie la faisabilité, fixe/ajuste le prix et le créneau, affecte un prestataire.
3. Confirme au client (message + changement de statut) ou refuse avec motif.
4. Marque la prestation `terminée`, ce qui déclenche l'encaissement si paiement à la prestation.

### 5.4 Admin — revue hebdomadaire
1. Ouvre le dashboard : revenus (hébergement vs services), taux d'occupation, demandes en attente, incidents.
2. Consulte les rapports (période paramétrable), exporte en PDF/CSV.
3. Ajuste les prix, les disponibilités, les permissions de l'équipe.
4. Vérifie le journal d'audit.

## 6. Fonctionnalités par espace

### 6.1 Site vitrine (public)
- Page d'accueil : hero, présentation de l'appartement, galerie, liste des 10 services, destinations touristiques, section confiance, contact, appel à réserver.
- Pages : l'appartement (détail équipements + galerie + règles), les services (détail + tarifs indicatifs), à propos, contact, mentions légales / CGU / politique de confidentialité / politique cookies.
- **Bandeau de consentement cookies** (voir §8).
- **PWA** : manifeste, service worker, installable, mode hors-ligne pour les pages vitrines et l'historique déjà chargé.
- SEO : métadonnées, Open Graph, `sitemap.xml`, `robots.txt`, données structurées `LodgingBusiness`.
- i18n : **français par défaut**, anglais en option (structure i18n prévue dès la v1).

### 6.2 Espace client
- **Compte** : inscription, connexion, réinitialisation mot de passe par e-mail, profil (identité, téléphone *non vérifié*, préférences, langue), suppression de compte (RGPD-like).
- **Recherche & disponibilités** : sélecteur de dates, nombre de voyageurs, affichage de la disponibilité en temps réel, prix calculé (nuitée + frais + éventuelle remise long séjour).
- **Fiche appartement** : photos, **vidéos**, équipements, localisation approximative, règles, conditions d'annulation, avis internes (si activés).
- **Réservation** : création, paiement (acompte/total), modification/annulation selon politique, statut, documents (reçu).
- **Services additionnels** : catalogue par catégories, commande, créneau, options, suivi de statut, réédition.
- **Paiement (simulé)** : parcours Mobile Money (MTN, Moov, Celtis) + carte, écran de simulation avec statut forçable ; reçus PDF téléchargeables ; historique des transactions. Machine à états identique à un vrai paiement.
- **Messagerie** : fil unique avec l'entreprise par réservation + fil « support » général, temps réel, pièces jointes (photos), accusés de lecture.
- **Historique** : réservations passées/à venir, commandes de services, paiements.
- **Notifications** : in-app (cloche), email, push PWA ; WhatsApp optionnel ; préférences par canal.
- **Assistant IA** : bouton flottant ; répond aux questions (check-in, équipements, quartier, services), aide à réserver et à commander, escalade vers un humain.

### 6.3 Espace staff / employés
- **Connexion sécurisée** (e-mail + mot de passe, 2FA TOTP optionnelle), sessions à durée limitée, déconnexion auto après inactivité.
- **Tableau de bord opérationnel** : arrivées / départs du jour, demandes de services en attente, messages non lus, tâches assignées.
- **Réservations** : liste filtrable, détail, changement de statut, enregistrement arrivée/départ, notes internes, modification encadrée (dates, montants) avec traçabilité.
- **Demandes de services** : file priorisée, acceptation/refus (motif), fixation du prix, planification, affectation d'un prestataire, clôture.
- **Clients** : fiche client (coordonnées, historique, notes internes, préférences), pas d'accès aux moyens de paiement complets.
- **Communication** : messagerie avec le client, modèles de réponses, envoi de notifications.
- **Appartement(s) & disponibilités** : blocage/déblocage de dates, prix par période, contenus (photos/vidéos/équipements) selon permission.
- **Services (catalogue)** : activer/désactiver, éditer descriptions et tarifs indicatifs selon permission.
- **Suivi selon rôle** : chaque action est limitée par les permissions du rôle ; l'historique des actions de l'employé est consultable par l'admin.

### 6.4 Espace administrateur
- **Dashboard complet** : KPIs (revenu total, revenu hébergement, revenu services, taux d'occupation, panier moyen, délai moyen de traitement d'une demande, taux de refus), graphiques par période.
- **Statistiques réservations & revenus** : par mois, par service, par canal de paiement, saisonnalité, prévisionnel simple.
- **Gestion de l'équipe & permissions** : créer/désactiver un employé, attribuer un ou plusieurs rôles, permissions fines (matrice), réinitialiser un accès.
- **Appartements** : création, contenus, équipements, règles, politique d'annulation, prix de base et saisons.
- **Disponibilités** : calendrier global, blocages, synchronisation iCal (import/export) en option.
- **Paiements** : liste des transactions, statut, rapprochement, remboursements, litiges, paramétrage de l'agrégateur et des comptes marchands MoMo.
- **Rapports** : génération sur période (revenus, occupation, services, activité de l'équipe), export **PDF & CSV**, envoi programmé par email.
- **Historique des actions (audit)** : qui a fait quoi, quand, sur quel objet, valeur avant/après ; filtrable ; non modifiable.
- **Paramètres** : informations de l'entreprise, coordonnées, textes légaux, canaux de notification, clés d'intégration, langues.

## 7. Assistant IA (résumé)

Un assistant unique, **contextualisé par rôle et par données de l'utilisateur connecté**, bâti sur une **couche d'abstraction multi-fournisseurs** : on branche Claude, OpenAI, Gemini, Mistral, une API compatible OpenAI (Groq, OpenRouter, Ollama…), ou un mock, en changeant une seule variable de configuration. Aucun fournisseur n'est codé en dur.

- **Client** : FAQ séjour, aide à la réservation et à la commande de services, informations pratiques Cotonou / tourisme, guidage check-in, rédaction de messages, escalade humaine.
- **Staff** : résumé d'un dossier client, brouillons de réponses, aide à la priorisation de la file, rappel des procédures, recherche dans le catalogue et les réservations en langage naturel.
- **Admin** : questions sur les chiffres (« revenu services en août », « taux d'occupation ce trimestre »), synthèse de rapport, détection d'anomalies simples.

Détails (fournisseur, garde-fous, RAG, outils) : [docs/ASSISTANT-IA.md](docs/ASSISTANT-IA.md).

## 8. Consentement cookies & vie privée

- **Bandeau de consentement** au premier accès : *Nécessaires* (toujours actifs), *Mesure d'audience*, *Marketing* (désactivés par défaut). Choix mémorisé, révocable via un lien en pied de page.
- Aucun script non nécessaire (analytics, pixels) avant consentement.
- Pages **Politique de confidentialité**, **Politique cookies**, **CGU/CGV**, **Mentions légales**.
- Droits utilisateur : accès, rectification, export, suppression du compte et des données associées (hors obligations légales de conservation des preuves de paiement).
- Données de paiement : aucun vrai moyen de paiement (paiement simulé) ; en production, délégation à l'agrégateur (PCI hors périmètre).
- Hébergement des données : un projet Supabase, région `eu-west` (voir Architecture).
- Démo : uniquement des données fictives, pas de vraie PII de client réel.

## 9. Exigences non fonctionnelles

- **PWA / mobile-first** : cible principale = smartphone Android, connexions 3G/4G ; budget performance strict (LCP < 2,5 s sur 4G), images optimisées, `next/image`, lazy-loading, offline pour le contenu déjà vu.
- **Disponibilité** : viser 99,5 % ; dégradation gracieuse si l'agrégateur de paiement est indisponible (réservation « en attente de paiement »).
- **Sécurité** : RLS Supabase sur toutes les tables, séparation stricte des espaces, 2FA staff/admin, rate-limiting sur l'auth et les paiements, journal d'audit inviolable, secrets hors du dépôt.
- **Accessibilité** : contraste AA, navigation clavier, libellés ARIA sur les composants interactifs.
- **Observabilité** : logs d'erreurs (frontend + Edge Functions), alerte sur échec de webhook paiement.
- **Sauvegardes** : PITR Supabase activé ; export hebdomadaire du schéma + données critiques.
- **Langue du code & de l'UI** : UI en français (i18n prête), code et noms techniques en anglais.
- **RGPD-like / loi béninoise (APDP)** : registre de traitement, consentement, durées de conservation documentées.

## 10. Contraintes & partis pris

- **But démonstratif** : on prépare et on construit un environnement réaliste, mais sans agrégateur de paiement réel ni infrastructure lourde.
- **Hébergement** : frontend **Vercel** + backend **Supabase** (décidé). L'hébergement mutualisé cPanel existant ne porte pas l'app ; il sert aux e-mails `@les2palmiers.site`.
- **Vitrine existante archivée** : le code de la vitrine Next.js a été sorti du dossier vers `Desktop/les-2-palmiers-archive-vitrine/`. On repart d'un projet Next.js propre en **réutilisant** design, textes et composants — voir [Référence vitrine](docs/REFERENCE-VITRINE.md).
- **Paiement simulé** : Edge Function `payments-sim`, interface prête à recevoir FedaPay/KkiaPay plus tard sans réécriture.
- **Auth** : e-mail + mot de passe uniquement (pas de SMS/OTP — coût et complexité injustifiés en démo).
- **Un seul projet Supabase** (dev = preview = prod démo). Un 2ᵉ projet « prod » sera créé le jour d'une mise en production réelle.
- Projet mené par **un développeur solo** : privilégier les briques managées (Supabase, Vercel, service e-mail) plutôt que de l'infra à opérer.

## 11. Critères d'acceptation v1 (résumé)

- [ ] Un visiteur peut consulter le site vitrine hors-ligne après une première visite.
- [ ] Un client peut créer un compte (e-mail + mot de passe), réserver des dates réellement disponibles et « payer » via le simulateur.
- [ ] Une double réservation sur les mêmes dates est impossible (verrou côté base).
- [ ] Le simulateur de paiement permet de forcer succès / échec / attente, et la réservation réagit correctement à chaque cas.
- [ ] Un client peut commander au moins un service à prix fixe et un service « sur devis ».
- [ ] Client et staff échangent des messages en temps réel avec notification.
- [ ] Le staff traite une demande de service de bout en bout selon son rôle.
- [ ] L'admin voit des revenus et un taux d'occupation justes, et exporte un rapport PDF.
- [ ] Toute action sensible du staff/admin apparaît dans le journal d'audit.
- [ ] L'assistant IA répond à une question séjour et refuse proprement hors périmètre — et on peut changer de fournisseur d'IA sans modifier le code applicatif.
- [ ] Aucun cookie non nécessaire n'est déposé avant consentement.
- [ ] Les comptes de démo (client/staff/admin) permettent de parcourir toute la solution.
