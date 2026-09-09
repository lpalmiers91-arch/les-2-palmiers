// Adaptateur Anthropic (Claude) — HTTP brut + SSE, pour rester homogène avec les
// autres adaptateurs de la passerelle. Le modèle est piloté par AI_MODEL.
//
// Réf. API : POST https://api.anthropic.com/v1/messages (stream SSE)
// En-têtes : x-api-key, anthropic-version: 2023-06-01

import { type AiProvider, type ChatOptions, type StreamEvent, errFrom } from "../types.ts";

const API = "https://api.anthropic.com/v1/messages";
const VERSION = "2023-06-01";
// Défaut recommandé par Anthropic. Pour une démo à faible coût, définir
// AI_MODEL=claude-haiku-4-5 (ou claude-sonnet-5).
const DEFAULT_MODEL = "claude-opus-5";

interface Cfg { apiKey: string; model?: string; maxTokens?: number; temperature?: number }

export function createAnthropicProvider(cfg: Cfg): AiProvider {
  const model = cfg.model || DEFAULT_MODEL;

  async function* chat(opts: ChatOptions): AsyncIterable<StreamEvent> {
    const body: Record<string, unknown> = {
      model,
      max_tokens: opts.maxTokens ?? cfg.maxTokens ?? 2048,
      stream: true,
      messages: opts.messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content })),
    };
    if (opts.system) body.system = opts.system;
    if (opts.temperature ?? cfg.temperature) body.temperature = opts.temperature ?? cfg.temperature;
    if (opts.tools?.length) {
      body.tools = opts.tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.parameters,
      }));
    }

    let res: Response;
    try {
      res = await fetch(API, {
        method: "POST",
        signal: opts.signal,
        headers: {
          "x-api-key": cfg.apiKey,
          "anthropic-version": VERSION,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      yield { type: "error", error: { code: "provider_down", message: String(e), retryable: true } };
      return;
    }

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => res.statusText);
      yield { type: "error", error: errFrom(res.status, text) };
      return;
    }

    // --- parse SSE ---
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buf = "";
    let toolId = "";
    let toolName = "";
    let toolJson = "";
    let usage: { inputTokens?: number; outputTokens?: number } = {};
    let stopReason: string | undefined;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += value;
      const chunks = buf.split("\n\n");
      buf = chunks.pop() ?? "";

      for (const chunk of chunks) {
        const line = chunk.split("\n").find((l) => l.startsWith("data:"));
        if (!line) continue;
        const payload = line.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;

        let ev: any;
        try { ev = JSON.parse(payload); } catch { continue; }

        switch (ev.type) {
          case "message_start":
            usage.inputTokens = ev.message?.usage?.input_tokens;
            break;
          case "content_block_start":
            if (ev.content_block?.type === "tool_use") {
              toolId = ev.content_block.id;
              toolName = ev.content_block.name;
              toolJson = "";
            }
            break;
          case "content_block_delta":
            if (ev.delta?.type === "text_delta") {
              yield { type: "text-delta", text: ev.delta.text };
            } else if (ev.delta?.type === "input_json_delta") {
              toolJson += ev.delta.partial_json ?? "";
            }
            break;
          case "content_block_stop":
            if (toolName) {
              let args: Record<string, unknown> = {};
              try { args = toolJson ? JSON.parse(toolJson) : {}; } catch { /* ignore */ }
              yield { type: "tool-call", call: { id: toolId, name: toolName, arguments: args } };
              toolName = "";
              toolId = "";
              toolJson = "";
            }
            break;
          case "message_delta":
            if (ev.usage?.output_tokens) usage.outputTokens = ev.usage.output_tokens;
            if (ev.delta?.stop_reason) stopReason = ev.delta.stop_reason;
            break;
          case "message_stop":
            break;
          case "error":
            yield { type: "error", error: errFrom(500, ev.error?.message ?? "stream error") };
            return;
        }
      }
    }

    if (stopReason === "refusal") {
      yield {
        type: "error",
        error: { code: "bad_request", message: "Le modèle a décliné la requête (refusal).", retryable: false },
      };
      return;
    }
    yield { type: "done", usage, finishReason: stopReason };
  }

  return { name: "anthropic", model, supportsTools: true, chat };
}
