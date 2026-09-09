"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const spaces = [
  { id: "public", label: "Vitrine" },
  { id: "client", label: "Espace client" },
  { id: "staff", label: "Espace staff" },
  { id: "admin", label: "Administration" },
];

export function AiSettingsForm({
  enabledSpaces,
  defaultProvider,
  defaultModel,
}: {
  enabledSpaces: string[];
  defaultProvider: string;
  defaultModel: string;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState<string[]>(enabledSpaces);
  const [provider, setProvider] = useState(defaultProvider);
  const [model, setModel] = useState(defaultModel);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setBusy(true);
    setSaved(false);
    await createClient()
      .from("ai_settings")
      .update({ enabled_spaces: enabled, default_provider: provider, default_model: model || null })
      .eq("id", 1);
    setBusy(false);
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6">
        <h2 className="display text-[1.1rem] text-ink">Où l'assistant est disponible</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {spaces.map((s) => {
            const on = enabled.includes(s.id);
            return (
              <button
                key={s.id}
                onClick={() => setEnabled((e) => (on ? e.filter((x) => x !== s.id) : [...e, s.id]))}
                className={`press rounded-full border px-3 py-1.5 text-[13px] font-medium ${
                  on ? "border-forest bg-forest text-bone" : "border-line text-ink-3"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6">
        <h2 className="display text-[1.1rem] text-ink">Fournisseur d'IA</h2>
        <p className="mt-1.5 text-[13px] text-ink-3">
          Le fournisseur est interchangeable. La clé d'API se règle côté serveur
          (variable d'environnement de la fonction), jamais ici.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Fournisseur</span>
            <select className="field" value={provider} onChange={(e) => setProvider(e.target.value)}>
              <option value="echo">Démo (réponses simulées)</option>
              <option value="anthropic">Claude (Anthropic)</option>
              <option value="openai">OpenAI</option>
              <option value="google">Gemini (Google)</option>
              <option value="mistral">Mistral</option>
              <option value="openai-compatible">API compatible OpenAI</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Modèle</span>
            <input className="field" value={model} placeholder="ex. claude-haiku-4-5" onChange={(e) => setModel(e.target.value)} />
          </label>
        </div>
      </div>

      <button
        onClick={save}
        disabled={busy}
        className="press flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-6 text-[13.5px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {saved ? <><Check className="h-4 w-4" /> Enregistré</> : "Enregistrer"}
      </button>
    </div>
  );
}
