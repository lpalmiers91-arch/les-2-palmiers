"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Tier = { name: string; min_points: number; perk: string };
export type LoyaltySettings = {
  enabled: boolean;
  currency_per_point: number;
  signup_bonus: number;
  review_bonus: number;
  tiers: Tier[];
};

export function LoyaltySettingsForm({ initial }: { initial: LoyaltySettings }) {
  const router = useRouter();
  const [s, setS] = useState<LoyaltySettings>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function f<K extends keyof LoyaltySettings>(k: K, v: LoyaltySettings[K]) {
    setS((p) => ({ ...p, [k]: v }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const { error } = await createClient()
      .from("loyalty_settings")
      .update({
        enabled: s.enabled,
        currency_per_point: s.currency_per_point,
        signup_bonus: s.signup_bonus,
        review_bonus: s.review_bonus,
        tiers: [...s.tiers].sort((a, b) => a.min_points - b.min_points),
      })
      .eq("id", 1);
    setSaving(false);
    if (!error) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    }
  }

  return (
    <form onSubmit={save} className="rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6">
      <label className="flex items-center justify-between">
        <span className="text-[14px] font-medium text-ink">Programme de fidélité actif</span>
        <input
          type="checkbox"
          checked={s.enabled}
          onChange={(e) => f("enabled", e.target.checked)}
          className="h-5 w-5"
        />
      </label>

      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        <L label="1 point tous les… (XOF dépensés)">
          <input
            type="number"
            className="field tnum"
            value={s.currency_per_point}
            onChange={(e) => f("currency_per_point", Number(e.target.value))}
          />
        </L>
        <L label="Bonus d'inscription">
          <input
            type="number"
            className="field tnum"
            value={s.signup_bonus}
            onChange={(e) => f("signup_bonus", Number(e.target.value))}
          />
        </L>
        <L label="Bonus par avis publié">
          <input
            type="number"
            className="field tnum"
            value={s.review_bonus}
            onChange={(e) => f("review_bonus", Number(e.target.value))}
          />
        </L>
      </div>

      <div className="mt-6">
        <span className="mb-2 block text-[13px] font-medium text-ink-2">Paliers</span>
        <div className="space-y-2">
          {s.tiers.map((t, i) => (
            <div key={i} className="grid grid-cols-[1fr_90px_1.4fr_auto] items-center gap-2">
              <input
                className="field"
                placeholder="Nom"
                value={t.name}
                onChange={(e) =>
                  f("tiers", s.tiers.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))
                }
              />
              <input
                type="number"
                className="field tnum"
                placeholder="pts"
                value={t.min_points}
                onChange={(e) =>
                  f(
                    "tiers",
                    s.tiers.map((x, j) => (j === i ? { ...x, min_points: Number(e.target.value) } : x)),
                  )
                }
              />
              <input
                className="field"
                placeholder="Avantage"
                value={t.perk}
                onChange={(e) =>
                  f("tiers", s.tiers.map((x, j) => (j === i ? { ...x, perk: e.target.value } : x)))
                }
              />
              <button
                type="button"
                onClick={() => f("tiers", s.tiers.filter((_, j) => j !== i))}
                className="press p-2 text-ink-3 hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => f("tiers", [...s.tiers, { name: "", min_points: 0, perk: "" }])}
            className="press flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[12.5px] text-ink-2 hover:border-ink/30"
          >
            <Plus className="h-3.5 w-3.5" /> Ajouter un palier
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="press mt-6 flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-6 text-[13.5px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
      >
        {saving && <Loader2 className="h-4 w-4 animate-spin" />}
        {saved ? (
          <>
            <Check className="h-4 w-4" /> Enregistré
          </>
        ) : (
          "Enregistrer"
        )}
      </button>
    </form>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
      {children}
    </label>
  );
}
