// Adaptateur "OpenAI-compatible" — couvre OpenAI, Groq, OpenRouter, Together,
// Mistral (API OpenAI), Ollama, vLLM… Tout endpoint qui expose /chat/completions.
// AI_BASE_URL pointe vers la racine de l'API (sans /chat/completions).

import { type AiProvider, type ChatOptions, type StreamEvent, errFrom } from "../types.ts";

interface Cfg {
  apiKey?: string;
  model?: string;
  baseUrl?: string;      // ex. https://api.openai.com/v1 , https://api.groq.com/openai/v1
  maxTokens?: number;
  temperature?: number;
}

export function createOpenAICompatibleProvider(cfg: Cfg): AiProvider {
  const model = cfg.model || "gpt-4o-mini";
  const base = (cfg.baseUrl || "https://api.openai.com/v1").replace(/\/$/, "");

  async function* chat(opts: ChatOptions): AsyncIterable<StreamEvent> {
    const messages = [
      ...(opts.system ? [{ role: "system", content: opts.system }] : []),
      ...opts.messages.map((m) => ({
        role: m.role,
        content: m.content,
        ...(m.tool_call_id ? { tool_call_id: m.tool_call_id } : {}),
      })),
    ];

    const body: Record<string, unknown> = {
      model,
      stream: true,
      stream_options: { include_usage: true },
      messages,
      max_tokens: opts.maxTokens ?? cfg.maxTokens ?? 2048,
      temperature: opts.temperature ?? cfg.temperature ?? 0.4,
    };
    if (opts.tools?.length) {
      body.tools = opts.tools.map((t) => ({
        type: "function",
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }));
    }

    let res: Response;
    try {
      res = await fetch(`${base}/chat/completions`, {
        method: "POST",
        signal: opts.signal,
        headers: {
          "content-type": "application/json",
          ...(cfg.apiKey ? { authorization: `Bearer ${cfg.apiKey}` } : {}),
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

    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let buf = "";
    const toolAcc: Record<number, { id: string; name: string; args: string }> = {};
    let usage: { inputTokens?: number; outputTokens?: number } = {};
    let finishReason: string | undefined;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += value;
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";

      for (const raw of lines) {
        const line = raw.trim();
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (payload === "[DONE]") continue;

        let ev: any;
        try { ev = JSON.parse(payload); } catch { continue; }

        if (ev.usage) {
          usage = { inputTokens: ev.usage.prompt_tokens, outputTokens: ev.usage.completion_tokens };
        }
        const choice = ev.choices?.[0];
        if (!choice) continue;
        if (choice.finish_reason) finishReason = choice.finish_reason;

        const delta = choice.delta ?? {};
        if (delta.content) yield { type: "text-delta", text: delta.content };

        for (const tc of delta.tool_calls ?? []) {
          const i = tc.index ?? 0;
          toolAcc[i] ??= { id: tc.id ?? `call_${i}`, name: "", args: "" };
          if (tc.id) toolAcc[i].id = tc.id;
          if (tc.function?.name) toolAcc[i].name += tc.function.name;
          if (tc.function?.arguments) toolAcc[i].args += tc.function.arguments;
        }
      }
    }

    for (const t of Object.values(toolAcc)) {
      let args: Record<string, unknown> = {};
      try { args = t.args ? JSON.parse(t.args) : {}; } catch { /* ignore */ }
      yield { type: "tool-call", call: { id: t.id, name: t.name, arguments: args } };
    }
    yield { type: "done", usage, finishReason };
  }

  async function embed(texts: string[]): Promise<number[][]> {
    const res = await fetch(`${base}/embeddings`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...(cfg.apiKey ? { authorization: `Bearer ${cfg.apiKey}` } : {}),
      },
      body: JSON.stringify({ model: cfg.model || "text-embedding-3-small", input: texts }),
    });
    if (!res.ok) throw new Error(`embeddings ${res.status}: ${await res.text()}`);
    const j = await res.json();
    return j.data.map((d: { embedding: number[] }) => d.embedding);
  }

  return { name: "openai-compatible", model, supportsTools: true, chat, embed };
}
