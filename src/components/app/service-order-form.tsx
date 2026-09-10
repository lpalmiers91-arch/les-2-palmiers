"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatXOF } from "@/lib/format";
import { useT } from "@/lib/i18n/provider";

type Service = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  pricing_mode: string;
  base_price: number | null;
  lead_time_hours: number;
  options_schema: unknown;
};

type Field = { name: string; label: string; type: string; required?: boolean; options?: string[] };

export function ServiceOrderForm({
  service,
  reservations,
}: {
  service: Service;
  reservations: { id: string; label: string }[];
}) {
  const { t } = useT();
  const router = useRouter();
  const fields = (Array.isArray(service.options_schema) ? service.options_schema : []) as Field[];

  const [values, setValues] = useState<Record<string, string>>({});
  const [when, setWhen] = useState("");
  const [note, setNote] = useState("");
  const [reservationId, setReservationId] = useState(reservations[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("create_service_order", {
        p_service: service.id,
        p_options: values,
        p_scheduled_for: when ? new Date(when).toISOString() : undefined,
        p_address: undefined,
        p_note: note || undefined,
        p_reservation: reservationId || undefined,
      });
      if (error) throw error;
      setDone(true);
      setTimeout(() => {
        router.push("/app/services");
        router.refresh();
      }, 1400);
    } catch (err) {
      setError(translate(err, t));
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-forest text-bone">
          <Check className="h-6 w-6" />
        </span>
        <p className="mt-3 text-[15px] font-medium text-ink">{t("sof.sentT")}</p>
        <p className="mt-1 text-[13px] text-ink-3">
          {service.pricing_mode === "quote" ? t("sof.sentQuote") : t("sof.sentB")}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="display text-[1.2rem] text-ink">{service.title}</h2>
        <span className="text-[13px] font-medium text-ink-2">
          {service.pricing_mode === "fixed" && service.base_price
            ? formatXOF(service.base_price)
            : service.pricing_mode === "metered"
              ? t("sof.metered")
              : t("sof.quote")}
        </span>
      </div>
      {service.description && (
        <p className="mt-1.5 text-[13.5px] text-ink-3">{service.description}</p>
      )}

      <div className="mt-5 space-y-4">
        {fields.map((f) => (
          <label key={f.name} className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{f.label}</span>
            {f.type === "select" ? (
              <select
                className="field"
                required={f.required}
                value={values[f.name] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              >
                <option value="">{t("sof.choose")}</option>
                {(f.options ?? []).map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <textarea
                className="field min-h-20 py-2.5"
                required={f.required}
                value={values[f.name] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              />
            ) : (
              <input
                type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "time" ? "time" : "text"}
                className="field"
                required={f.required}
                value={values[f.name] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
              />
            )}
          </label>
        ))}

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-2">
            {t("sof.slot")} <span className="text-ink-3">({t("sof.optional")})</span>
          </span>
          <input type="datetime-local" className="field" value={when} onChange={(e) => setWhen(e.target.value)} />
          <span className="mt-1 block text-[11.5px] text-ink-3">
            {t("sof.leadTime", { h: service.lead_time_hours })}
          </span>
        </label>

        {reservations.length > 0 && (
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{t("sof.linkStay")}</span>
            <select className="field" value={reservationId} onChange={(e) => setReservationId(e.target.value)}>
              <option value="">{t("sof.none")}</option>
              {reservations.map((r) => (
                <option key={r.id} value={r.id}>{r.label}</option>
              ))}
            </select>
          </label>
        )}

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{t("sof.noteTeam")}</span>
          <textarea className="field min-h-16 py-2.5" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
      </div>

      {error && <p className="mt-4 text-[13px] text-danger">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="press mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-[14px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {t("sof.send")}
      </button>
    </form>
  );
}

function translate(err: unknown, t: (k: string) => string): string {
  const m = err instanceof Error ? err.message : String(err);
  if (/lead_time_not_met/.test(m)) return t("sof.errLeadTime");
  if (/service_unavailable/.test(m)) return t("sof.errUnavailable");
  return t("sof.errGeneric");
}
