# Assistant IA

> Lié à [SPEC.md](../SPEC.md) et [ARCHITECTURE.md](ARCHITECTURE.md). Version 0.2 — 2026-09-08.
> **Principe directeur : aucun fournisseur d'IA n'est imposé.** L'assistant fonctionne au-dessus d'une couche d'abstraction ; on branche Claude, OpenAI, Gemini, Mistral, un modèle auto-hébergé, etc. sans toucher au reste de l'application.

## 1. Objectif

Un **assistant unique**, présent dans les trois espaces, dont le comportement et l'accès aux données dépendent du **rôle de l'utilisateur** (ou de son absence de connexion sur la vitrine).

## 2. Modes selon le rôle

### 2.1 Visiteur (non connecté, vitrine)
- Questions générales : localisation, équipements de l'appartement, principe des services, zone touristique, comment réserver.
- Peut pré-remplir une intention de réservation (dates, nb de voyageurs) et inviter à créer un compte.
- **Aucune donnée privée**, aucun prix négocié, aucune disponibilité au-delà de « disponible / indisponible » pour des dates données.

### 2.2 Client (connecté)
- Contexte : ses réservations, ses commandes de services, ses messages, l'appartement réservé.
- Exemples :
  - « À quelle heure je peux arriver ? », « Où est le parking ? », « Quel est le code wifi ? » (si autorisé).
  - « Je veux un cuisinier demain soir pour 4 personnes » → prépare une commande de service en **brouillon**, l'utilisateur confirme.
  - « Change ma réservation au 12 » → explique la marche à suivre et crée une demande au staff (ne modifie jamais seul une réservation).
  - « Recommande-moi une excursion à Ouidah » → réponses tourisme.
  - Rédige un message au staff à partir d'une intention.
- **Escalade** : « je vous mets en relation avec l'équipe » → crée/rouvre une conversation support.

### 2.3 Staff / coordinateur
- Contexte : file des demandes, dossier du client concerné, catalogue, réservations (selon permissions).
- Exemples : « Résume le dossier L2P-2026-0042 », « Propose une réponse à ce client », « Quelles demandes sont en attente depuis plus de 24 h ? », « Rappelle-moi la procédure de check-out », recherche en langage naturel.
- **N'exécute aucune action irréversible** sans confirmation explicite dans l'UI.

### 2.4 Admin / propriétaire
- Contexte : vues agrégées (revenus, occupation, performance services, activité équipe).
- Exemples : « Revenu services en août vs juillet ? », « Taux d'occupation ce trimestre ? », « Quels services ont le plus de refus ? », « Génère la synthèse du rapport mensuel », signalement d'anomalies simples.

## 3. Architecture — couche d'abstraction multi-fournisseurs

```
Frontend (widget chat)
   │  POST /functions/v1/ai-assistant   { message, threadId, context }
   ▼
Edge Function  ai-assistant  (Deno)
   │  1. authentifie (JWT Supabase) → uid + rôles
   │  2. charge le contexte autorisé (requêtes filtrées par rôle / RLS)
   │  3. construit messages + system prompt (selon rôle) + catalogue d'outils
   │  4. appelle  aiProvider.chat(...)   ← INTERFACE COMMUNE
   │  5. exécute les outils demandés, reboucle si besoin
   │  6. renvoie la réponse (SSE) + actions proposées + sources
   ▼
┌──────────────────── Couche « AI Gateway » ────────────────────┐
│  interface AiProvider {                                        │
│    chat(opts): AsyncIterable<Chunk>   // streaming             │
│    supportsTools: boolean                                      │
│    countTokens?(msgs): number                                  │
│  }                                                             │
│                                                               │
│  adapters/                                                     │
│   ├─ anthropic.ts   (Claude)                                   │
│   ├─ openai.ts      (GPT / API compatible OpenAI)              │
│   ├─ google.ts      (Gemini)                                   │
│   ├─ mistral.ts                                                │
│   ├─ openai-compatible.ts  (Groq, OpenRouter, Ollama, vLLM…)   │
│   └─ echo.ts        (mock — mode démo, aucune clé requise)     │
│                                                               │
│  Sélection par variable d'env :  AI_PROVIDER=anthropic|openai… │
│  + modèle :  AI_MODEL=...   + clé :  AI_API_KEY=...            │
│  Repli en cascade :  AI_FALLBACK_PROVIDER=...                  │
└───────────────────────────────────────────────────────────────┘
```

### Contrat commun (à respecter par chaque adaptateur)
- **Entrée normalisée** : `{ system, messages: [{role, content}], tools: ToolDef[], temperature, maxTokens }`.
- **Sortie normalisée (stream)** : événements `text-delta`, `tool-call`, `tool-result`, `done`, `error`.
- **Outils / function calling** : format d'outil neutre → converti par l'adaptateur vers le format natif du fournisseur (Anthropic `tools`, OpenAI `tools`, Gemini `functionDeclarations`…). Si un fournisseur ne supporte pas les outils → dégradation : l'assistant répond en texte seul et propose des liens.
- **Erreurs** : normalisées (`rate_limited`, `context_length`, `provider_down`, `invalid_key`) → l'Edge Function peut basculer sur `AI_FALLBACK_PROVIDER`.

### Configuration (aucune valeur en dur)
| Variable | Rôle |
|---|---|
| `AI_PROVIDER` | `anthropic` \| `openai` \| `google` \| `mistral` \| `openai-compatible` \| `echo` |
| `AI_MODEL` | id du modèle chez le fournisseur |
| `AI_API_KEY` | clé (secret Edge Function — **jamais** côté client) |
| `AI_BASE_URL` | pour `openai-compatible` (Groq, OpenRouter, Ollama, vLLM auto-hébergé…) |
| `AI_FALLBACK_PROVIDER` / `AI_FALLBACK_MODEL` / `AI_FALLBACK_API_KEY` | repli si le principal échoue |
| `AI_MAX_TOKENS`, `AI_TEMPERATURE` | réglages génériques |
| `AI_MONTHLY_BUDGET_USD` | coupe-circuit de coût (optionnel) |

> **Mode démo** : `AI_PROVIDER=echo` → réponses simulées déterministes (scénarios scriptés) pour montrer les parcours sans consommer d'API ni de clé. On bascule vers un vrai fournisseur en changeant une variable d'environnement.

### Où brancher un nouveau fournisseur
Un seul fichier à ajouter : `supabase/functions/_shared/ai/adapters/<nom>.ts` qui implémente `AiProvider`, puis l'enregistrer dans la fabrique `getProvider(name)`. Rien d'autre ne bouge.

### Réglages par rôle (table `ai_settings`, éditable par l'admin)
- Fournisseur / modèle par défaut, et éventuellement un modèle différent pour l'admin (analytique) vs le client (conversationnel).
- Activation/désactivation de l'assistant par espace.
- Quotas (messages/jour) par rôle.
- Édition des *system prompts* et des messages d'accueil sans redéploiement.

## 4. Accès aux données (outils / RAG)

L'assistant ne « voit » que ce que le rôle autorise. Outils exposés au modèle (format neutre), chacun ré-appliquant les règles RLS avec le JWT de l'utilisateur :

| Outil | Rôles | Effet |
|---|---|---|
| `get_apartment_info` | tous | fiche appartement publiée (équipements, règles, check-in) |
| `check_availability(range)` | tous | disponible / indisponible pour une période |
| `list_my_reservations` / `list_my_service_orders` | client | éléments de l'utilisateur |
| `draft_service_order(...)` | client | crée un `service_orders` en `status=draft` (confirmation UI requise) |
| `draft_message(to, body)` | client, staff | prépare un message (non envoyé) |
| `get_reservation_dossier(ref)` | staff, admin | synthèse d'une réservation (selon permissions) |
| `search_queue(filter)` | staff, admin | file des demandes/réservations à traiter |
| `get_kpi(metric, period)` | admin | lit une vue agrégée |
| `get_procedure(key)` / `search_kb(query)` | selon audience | fiches procédures / base de connaissances |

**Base de connaissances** : table `kb_articles` (`slug`, `title`, `body` markdown, `audience` ∈ {`public`,`client`,`staff`}, `embedding` vector) + recherche vectorielle `pgvector`. Les réponses citent l'article source.
- Les **embeddings** passent aussi par la couche d'abstraction : `AI_EMBEDDINGS_PROVIDER` / `AI_EMBEDDINGS_MODEL` (souvent le même fournisseur, parfois un autre). Adaptateur `embed(texts): number[][]`.

## 5. Garde-fous (indépendants du fournisseur)

- **System prompt par rôle** : périmètre, ton (chaleureux, premium, concis), langue = celle de l'utilisateur (fr par défaut), interdiction de divulguer les données d'autres clients, d'inventer une disponibilité ou un prix.
- **Aucune écriture directe** : l'assistant *propose*, l'utilisateur *confirme* dans l'UI. Seule exception : les brouillons (`draft_*`).
- Hors périmètre → réponse courte + orientation vers un humain.
- Filtrage des sorties : pas de secrets (codes, clés), pas de PII d'un tiers.
- Journalisation : chaque échange est stocké (`ai_threads` / `ai_messages`) ; les appels d'outils staff/admin apparaissent dans `audit_log`.
- Bandeau au 1er usage : « Assistant automatique — vérifiez les informations importantes, un conseiller reste disponible. »
- Le widget ne se charge **pas** tant que les cookies nécessaires ne sont pas acceptés.
- Rate-limiting + budget mensuel appliqués dans l'Edge Function, avant tout appel fournisseur.

## 6. UI

- Bouton flottant (bas-droite), palette `palm` / `gold`.
- Panneau : historique du fil, saisie, suggestions contextuelles (« Voir mes réservations », « Commander un ménage »).
- Actions proposées = boutons (« Créer la commande », « Envoyer au staff ») qui ouvrent le formulaire pré-rempli.
- Indicateur « rédige… » pendant le streaming (voir skill `transitions-dev`).
- Accessible clavier, annonces ARIA live pour le texte streamé.

## 7. Étapes de mise en œuvre

1. Couche `_shared/ai` : interface `AiProvider`, adaptateurs `echo` + `openai-compatible` + `anthropic`, fabrique, normalisation des erreurs.
2. Table `ai_settings` + `ai_threads` / `ai_messages`.
3. Edge Function `ai-assistant` : auth, contexte client minimal, streaming SSE, garde-fous, quotas.
4. Widget chat client.
5. Outils `check_availability`, `draft_service_order`, `draft_message`.
6. `kb_articles` + `pgvector` + adaptateur d'embeddings + seed (FAQ, procédures, tourisme).
7. Mode staff (dossier, file, procédures).
8. Mode admin (KPI en langage naturel, synthèses).
9. Repli fournisseur en cascade + coupe-circuit budget.
10. Détection d'anomalies (job planifié → `notifications` admin).
