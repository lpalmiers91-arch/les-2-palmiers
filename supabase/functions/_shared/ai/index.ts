// AI Gateway — fabrique de fournisseurs + exécution avec repli en cascade.
// Ajouter un fournisseur = ajouter un fichier dans adapters/ et une entrée ici.

import type { AiProvider, ChatOptions, ProviderConfig, StreamEvent } from "./types.ts";
import { createEchoProvider } from "./adapters/echo.ts";
import { createAnthropicProvider } from "./adapters/anthropic.ts";
import { createOpenAICompatibleProvider } from "./adapters/openai-compatible.ts";

export * from "./types.ts";

export function getProvider(cfg: ProviderConfig): AiProvider {
  switch (cfg.provider) {
    case "echo":
      return createEchoProvider(cfg.model);
    case "anthropic":
      return createAnthropicProvider({
        apiKey: cfg.apiKey ?? "",
        model: cfg.model,
        maxTokens: cfg.maxTokens,
        temperature: cfg.temperature,
      });
    case "openai":
    case "mistral":
    case "groq":
    case "openrouter":
    case "openai-compatible":
      return createOpenAICompatibleProvider({
        apiKey: cfg.apiKey,
        model: cfg.model,
        baseUrl: cfg.baseUrl ?? defaultBaseUrl(cfg.provider),
        maxTokens: cfg.maxTokens,
        temperature: cfg.temperature,
      });
    // "google" (Gemini) : à ajouter — adapters/google.ts (format functionDeclarations)
    default:
      throw new Error(`Fournisseur IA inconnu : ${cfg.provider}`);
  }
}

function defaultBaseUrl(provider: string): string | undefined {
  switch (provider) {
    case "openai": return "https://api.openai.com/v1";
    case "mistral": return "https://api.mistral.ai/v1";
    case "groq": return "https://api.groq.com/openai/v1";
    case "openrouter": return "https://openrouter.ai/api/v1";
    default: return undefined;
  }
}

/** Lit la config depuis l'environnement (Edge Function secrets). */
export function providerConfigFromEnv(prefix = ""): ProviderConfig {
  const g = (k: string) => Deno.env.get(`${prefix}${k}`) || undefined;
  return {
    provider: g("AI_PROVIDER") ?? "echo",
    model: g("AI_MODEL"),
    apiKey: g("AI_API_KEY"),
    baseUrl: g("AI_BASE_URL"),
    maxTokens: g("AI_MAX_TOKENS") ? Number(g("AI_MAX_TOKENS")) : undefined,
    temperature: g("AI_TEMPERATURE") ? Number(g("AI_TEMPERATURE")) : undefined,
  };
}

export function fallbackConfigFromEnv(): ProviderConfig | null {
  const p = Deno.env.get("AI_FALLBACK_PROVIDER");
  if (!p) return null;
  return {
    provider: p,
    model: Deno.env.get("AI_FALLBACK_MODEL") || undefined,
    apiKey: Deno.env.get("AI_FALLBACK_API_KEY") || undefined,
    baseUrl: Deno.env.get("AI_FALLBACK_BASE_URL") || undefined,
  };
}

/**
 * Exécute chat() avec repli automatique : si le fournisseur principal renvoie une
 * erreur avant tout token, on bascule sur le fournisseur de repli.
 */
export async function* chatWithFallback(
  primary: ProviderConfig,
  opts: ChatOptions,
): AsyncIterable<StreamEvent & { provider?: string; model?: string }> {
  const configs = [primary, fallbackConfigFromEnv()].filter(Boolean) as ProviderConfig[];

  for (let i = 0; i < configs.length; i++) {
    const provider = getProvider(configs[i]);
    let emitted = false;
    let failed = false;

    for await (const ev of provider.chat(opts)) {
      if (ev.type === "error" && !emitted && i < configs.length - 1 && ev.error.retryable) {
        failed = true;
        break; // tenter le repli
      }
      if (ev.type === "text-delta" || ev.type === "tool-call") emitted = true;
      yield { ...ev, provider: provider.name, model: provider.model };
    }
    if (!failed) return;
  }
}
