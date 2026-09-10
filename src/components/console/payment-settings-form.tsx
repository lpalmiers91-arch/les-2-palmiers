"use client";

import { useState } from "react";
import { Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { site } from "@/lib/site";
import { useT } from "@/lib/i18n/provider";

export type PaymentSettings = {
  active_provider: "sim" | "fedapay" | "kkiapay" | "stripe";
  mode: "test" | "live";
  fedapay_public_key: string | null;
  kkiapay_public_key: string | null;
  stripe_public_key: string | null;
  currency: string;
  multicurrency_enabled: boolean;
  fx_rates: Record<string, number>;
  manual_instructions: string | null;
};

const FX_CODES = ["EUR", "USD", "GBP", "CAD"];

const PROVIDERS = ["sim", "fedapay", "kkiapay", "stripe"] as const;

export function PaymentSettingsForm({ initial }: { initial: PaymentSettings }) {
  const { t } = useT();
  const [s, setS] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function f<K extends keyof PaymentSettings>(k: K, v: PaymentSettings[K]) {
    setS((prev) => ({ ...prev, [k]: v }));
    setDone(false);
  }

  async function save() {
    setBusy(true);
    setErr(null);
    const { error } = await createClient()
      .from("payment_settings")
      .update({
        active_provider: s.active_provider,
        mode: s.mode,
        fedapay_public_key: s.fedapay_public_key || null,
        kkiapay_public_key: s.kkiapay_public_key || null,
        stripe_public_key: s.stripe_public_key || null,
        currency: s.currency || "XOF",
        multicurrency_enabled: s.multicurrency_enabled,
        fx_rates: s.fx_rates,
        manual_instructions: s.manual_instructions?.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);
    setBusy(false);
    if (error) {
      setErr(t("paySettings.errSave"));
      return;
    }
    setDone(true);
  }

  const webhookUrl = `${site.url.replace("https://", "https://<projet>.supabase.co")}`;

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-ink-2">{t("paySettings.provider")}</label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {PROVIDERS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => f("active_provider", p)}
              className={`press rounded-[11px] border px-3 py-2.5 text-[13px] font-medium capitalize transition-colors ${
                s.active_provider === p
                  ? "border-forest bg-forest/[0.05] text-ink"
                  : "border-line text-ink-2 hover:border-ink/25"
              }`}
            >
              {p === "sim" ? t("paySettings.sim") : p}
            </button>
          ))}
        </div>
        {s.active_provider === "sim" && (
          <p className="mt-2 text-[12px] text-ink-3">{t("paySettings.simNote")}</p>
        )}
      </div>

      {s.active_provider !== "sim" && (
        <>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-ink-2">{t("paySettings.mode")}</label>
            <div className="flex gap-2">
              {(["test", "live"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => f("mode", m)}
                  className={`press rounded-full border px-4 py-2 text-[12.5px] font-medium transition-colors ${
                    s.mode === m ? "border-forest bg-forest/[0.05] text-ink" : "border-line text-ink-2"
                  }`}
                >
                  {m === "test" ? t("paySettings.modeTest") : t("paySettings.modeLive")}
                </button>
              ))}
            </div>
          </div>

          {s.active_provider === "fedapay" && (
            <Field
              label={t("paySettings.fedapayPk")}
              value={s.fedapay_public_key ?? ""}
              onChange={(v) => f("fedapay_public_key", v)}
              placeholder="pk_sandbox_… / pk_live_…"
            />
          )}
          {s.active_provider === "kkiapay" && (
            <Field
              label={t("paySettings.kkiapayPk")}
              value={s.kkiapay_public_key ?? ""}
              onChange={(v) => f("kkiapay_public_key", v)}
              placeholder="pk_…"
            />
          )}
          {s.active_provider === "stripe" && (
            <Field
              label={t("paySettings.stripePk")}
              value={s.stripe_public_key ?? ""}
              onChange={(v) => f("stripe_public_key", v)}
              placeholder="pk_test_… / pk_live_…"
            />
          )}

          <div className="rounded-[10px] bg-bone-2 p-3 text-[12px] leading-relaxed text-ink-3">
            <p className="font-medium text-ink-2">{t("paySettings.secretsTitle")}</p>
            <p className="mt-1">{t("paySettings.secretsBody")}</p>
            <ul className="mt-1.5 list-inside list-disc font-mono text-[11px]">
              {s.active_provider === "fedapay" && <li>FEDAPAY_SECRET_KEY</li>}
              {s.active_provider === "kkiapay" && <li>KKIAPAY_WEBHOOK_SECRET</li>}
              {s.active_provider === "stripe" && (
                <>
                  <li>STRIPE_SECRET_KEY</li>
                  <li>STRIPE_WEBHOOK_SECRET</li>
                </>
              )}
            </ul>
            <p className="mt-2">{t("paySettings.webhookHint")}</p>
            <code className="mt-1 block break-all rounded bg-bone px-2 py-1 text-[11px]">
              {webhookUrl}/functions/v1/payment-webhook/{s.active_provider}
            </code>
          </div>
        </>
      )}

      <div className="border-t border-line-soft pt-4">
        <label className="mb-1.5 block text-[13px] font-medium text-ink-2">
          {t("paySettings.manualInstr")}
        </label>
        <p className="mb-2 text-[12px] text-ink-3">{t("paySettings.manualInstrHint")}</p>
        <textarea
          className="field min-h-[120px] resize-y py-2 leading-relaxed"
          value={s.manual_instructions ?? ""}
          onChange={(e) => f("manual_instructions", e.target.value)}
          placeholder={t("paySettings.manualInstrPlaceholder")}
        />
      </div>

      <div className="border-t border-line-soft pt-4">
        <label className="flex items-center gap-2.5 text-[13px] font-medium text-ink-2">
          <input
            type="checkbox"
            checked={s.multicurrency_enabled}
            onChange={(e) => f("multicurrency_enabled", e.target.checked)}
            className="h-4 w-4 accent-forest"
          />
          {t("paySettings.multicurrency")}
        </label>
        {s.multicurrency_enabled && (
          <>
            <p className="mt-1.5 text-[12px] text-ink-3">{t("paySettings.fxNote")}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {FX_CODES.map((code) => (
                <label key={code} className="block">
                  <span className="mb-1 block text-[12px] text-ink-3">1 {code} =</span>
                  <input
                    type="number"
                    className="field tnum"
                    value={s.fx_rates[code] ?? ""}
                    onChange={(e) =>
                      f("fx_rates", { ...s.fx_rates, [code]: Number(e.target.value) || 0 })
                    }
                  />
                </label>
              ))}
            </div>
            <p className="mt-1 text-[11.5px] text-ink-3">{t("paySettings.fxUnit")}</p>
          </>
        )}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={save}
          disabled={busy}
          className="press inline-flex h-10 items-center gap-2 rounded-full bg-ink px-5 text-[13px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : done ? <Check className="h-4 w-4" /> : null}
          {done ? t("paySettings.saved") : t("paySettings.save")}
        </button>
        {err && <span className="text-[12.5px] text-danger">{err}</span>}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
      <input className="field" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
