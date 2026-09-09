# Edge Functions

> Déployées sur Supabase (Deno). Version 0.1 — 2026-09-09.

## `ai-assistant`

`POST /functions/v1/ai-assistant` — assistant IA unique, contextualisé par rôle.

**Requête** : `{ message: string, threadId?: string, space?: "public"|"client"|"staff"|"admin" }`
**Réponse** : flux **SSE** — `data: {type:"text"|"tool"|"action"|"done"|"error", ...}`

- L'espace est déduit des rôles du JWT (`admin` > `staff` > `client` > `public`) ; `space` ne peut que « descendre ».
- Prompt système par espace (surchargables dans `ai_settings.system_prompts`).
- Outils exposés selon l'espace (`_shared/ai/tools.ts`) — chacun requête Supabase **avec le JWT de l'utilisateur** (RLS appliquée) : `get_apartment_info`, `check_availability`, `list_my_reservations`, `list_my_service_orders`, `draft_service_order`, `draft_message`, `search_kb`, `get_kpi`.
- Les outils `draft_*` ne modifient rien → renvoient une `action` que le frontend fait confirmer.
- Persistance : `ai_threads` / `ai_messages` ; quota via `ai_settings.quotas` + `increment_ai_usage()`.
- Boucle d'outils bornée à 3 tours.

### Couche multi-fournisseurs (`_shared/ai/`)

| Fichier | Rôle |
|---|---|
| `types.ts` | contrat commun `AiProvider` + événements normalisés (`text-delta`, `tool-call`, `done`, `error`) |
| `index.ts` | fabrique `getProvider()` + `chatWithFallback()` (repli en cascade) + lecture de la config depuis l'env |
| `adapters/echo.ts` | **mock déterministe** — aucune clé, mode démo |
| `adapters/anthropic.ts` | Claude (HTTP + SSE) |
| `adapters/openai-compatible.ts` | OpenAI, Groq, OpenRouter, Mistral, Ollama, vLLM… (`/chat/completions`) |
| `adapters/google.ts` | *à ajouter* (Gemini `functionDeclarations`) |

**Config par variables d'env** (Edge Function secrets) :
`AI_PROVIDER` (`echo`\|`anthropic`\|`openai`\|`mistral`\|`groq`\|`openrouter`\|`openai-compatible`), `AI_MODEL`, `AI_API_KEY`, `AI_BASE_URL`, `AI_MAX_TOKENS`, `AI_TEMPERATURE`, `AI_FALLBACK_PROVIDER` (+ `_MODEL`/`_API_KEY`).

> **État** : `AI_PROVIDER=echo` (démo). Pour un vrai LLM :
> `supabase secrets set AI_PROVIDER=anthropic AI_MODEL=claude-haiku-4-5 AI_API_KEY=sk-ant-…`
> Ajouter un fournisseur = **un fichier** dans `adapters/` + une entrée dans `getProvider()`.

## `notify`

`POST /functions/v1/notify` — distribue une notification sur ses canaux.

**Requête** : `{ notification_id }` (recommandé) ou `{ user_id, type, title, body, channels? }`

- E-mail via Resend (`EMAIL_PROVIDER=resend`, gabarit HTML aux couleurs L2P) ou mode `log`.
- Push Web (VAPID) : stub — à compléter avec `npm:web-push` + clés VAPID.
- Respecte `profiles.preferences.channels`.
- Marque `notifications.sent_at`.
- À câbler : trigger DB `after insert on notifications` → `pg_net` → cette fonction (post-démo, ou appel depuis le frontend).

## `payments-sim`

Non nécessaire : les RPC `payment_init()` / `payment_resolve()` / `payment_refund()` (migration `160001`) sont appelables directement depuis le frontend. Une Edge Function ne servira qu'au jour d'un vrai agrégateur (webhook signé).

## Déploiement

```bash
supabase functions deploy ai-assistant
supabase functions deploy notify
supabase secrets set --env-file <fichier>   # ou clé par clé
```
`verify_jwt = true` sur les deux (la clé anon est un JWT valide → l'assistant reste accessible aux visiteurs).
