// Les 2 Palmiers — couche d'abstraction IA (AI Gateway)
// Contrat commun respecté par chaque adaptateur (Claude, OpenAI, Gemini, Mistral,
// API compatible OpenAI, ou mock). Aucun fournisseur codé en dur dans l'application.

export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  /** présent quand role === "tool" */
  tool_call_id?: string;
  /** présent quand l'assistant demande des outils */
  tool_calls?: ToolCall[];
}

export interface ToolDef {
  name: string;
  description: string;
  /** JSON Schema des paramètres */
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ChatOptions {
  system?: string;
  messages: ChatMessage[];
  tools?: ToolDef[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

/** Événements normalisés émis en streaming par tout adaptateur. */
export type StreamEvent =
  | { type: "text-delta"; text: string }
  | { type: "tool-call"; call: ToolCall }
  | { type: "done"; usage?: Usage; finishReason?: string }
  | { type: "error"; error: NormalizedError };

export interface Usage {
  inputTokens?: number;
  outputTokens?: number;
}

export type NormalizedErrorCode =
  | "rate_limited"
  | "context_length"
  | "provider_down"
  | "invalid_key"
  | "bad_request"
  | "unknown";

export interface NormalizedError {
  code: NormalizedErrorCode;
  message: string;
  retryable: boolean;
}

export interface AiProvider {
  readonly name: string;
  readonly model: string;
  readonly supportsTools: boolean;
  chat(opts: ChatOptions): AsyncIterable<StreamEvent>;
  embed?(texts: string[]): Promise<number[][]>;
}

export interface ProviderConfig {
  provider: string; // anthropic | openai | google | mistral | openai-compatible | echo
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  maxTokens?: number;
  temperature?: number;
}

export function errFrom(status: number, message: string): NormalizedError {
  if (status === 401 || status === 403) return { code: "invalid_key", message, retryable: false };
  if (status === 429) return { code: "rate_limited", message, retryable: true };
  if (status === 413 || /context length|too long|maximum context/i.test(message))
    return { code: "context_length", message, retryable: false };
  if (status >= 500) return { code: "provider_down", message, retryable: true };
  if (status >= 400) return { code: "bad_request", message, retryable: false };
  return { code: "unknown", message, retryable: true };
}
