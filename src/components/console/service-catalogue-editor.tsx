"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, ChevronDown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ServiceIcon } from "@/components/marketing/service-icon";
import { useT } from "@/lib/i18n/provider";

type Service = {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  active: boolean;
  pricing_mode: string;
  base_price: number | null;
  unit: string;
  lead_time_hours: number;
};

const PRICING = ["fixed", "metered", "quote"] as const;

export function ServiceCatalogueEditor({ services }: { services: Service[] }) {
  const router = useRouter();
  const { t } = useT();
  const [rows, setRows] = useState<Service[]>(services);
  const [open, setOpen] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  function edit(id: string, patch: Partial<Service>) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  async function save(row: Service) {
    setSavingId(row.id);
    setSavedId(null);
    const { error } = await createClient()
      .from("services")
      .update({
        title: row.title.trim(),
        description: row.description?.trim() || null,
        pricing_mode: row.pricing_mode,
        base_price:
          row.pricing_mode === "fixed" && row.base_price != null ? Math.round(row.base_price) : null,
        unit: row.unit.trim() || "prestation",
        lead_time_hours: Math.max(0, Math.round(row.lead_time_hours || 0)),
        active: row.active,
      })
      .eq("id", row.id);
    setSavingId(null);
    if (!error) {
      setSavedId(row.id);
      router.refresh();
      setTimeout(() => setSavedId((s) => (s === row.id ? null : s)), 2200);
    }
  }

  async function toggleActive(row: Service) {
    const next = !row.active;
    edit(row.id, { active: next });
    const { error } = await createClient()
      .from("services")
      .update({ active: next })
      .eq("id", row.id);
    if (error) edit(row.id, { active: !next });
    else router.refresh();
  }

  return (
    <ul className="space-y-3">
      {rows.map((s) => {
        const isOpen = open === s.id;
        return (
          <li
            key={s.id}
            className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-bone"
          >
            <div className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bone-2 text-forest-2">
                <ServiceIcon name={s.icon ?? "compass"} className="h-4 w-4" />
              </span>
              <button
                onClick={() => setOpen(isOpen ? null : s.id)}
                className="press min-w-0 flex-1 text-left"
              >
                <p className="truncate text-[14px] font-medium text-ink">
                  {s.title || t("console.catEditor.untitled")}
                </p>
                <p className="text-[12px] text-ink-3">
                  {s.pricing_mode === "fixed" && s.base_price
                    ? `${s.base_price.toLocaleString()} XOF / ${s.unit}`
                    : s.pricing_mode === "metered"
                      ? t("console.catEditor.metered")
                      : t("console.catEditor.quote")}{" "}
                  · {t("console.catEditor.lead")} {s.lead_time_hours} h ·{" "}
                  {s.active ? t("console.catEditor.active") : t("console.catEditor.suspended")}
                </p>
              </button>
              <button
                onClick={() => toggleActive(s)}
                role="switch"
                aria-checked={s.active}
                aria-label={s.active ? t("console.catEditor.suspend") : t("console.catEditor.activate")}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                  s.active ? "bg-forest" : "bg-bone-3"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-bone shadow transition-transform ${
                    s.active ? "translate-x-[22px]" : "translate-x-0.5"
                  }`}
                />
              </button>
              <button
                onClick={() => setOpen(isOpen ? null : s.id)}
                aria-label={t("console.catEditor.details")}
                className="press text-ink-3"
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
            </div>

            {isOpen && (
              <div className="border-t border-line px-4 py-4 sm:px-5">
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-[12px] font-medium text-ink-2">
                      {t("console.catEditor.label")}
                    </span>
                    <input
                      className="field text-[13px]"
                      value={s.title}
                      onChange={(e) => edit(s.id, { title: e.target.value })}
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-[12px] font-medium text-ink-2">
                      {t("console.catEditor.description")}
                    </span>
                    <textarea
                      className="field min-h-[70px] resize-y text-[13px]"
                      value={s.description ?? ""}
                      onChange={(e) => edit(s.id, { description: e.target.value })}
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[12px] font-medium text-ink-2">
                      {t("console.catEditor.pricingMode")}
                    </span>
                    <select
                      className="field text-[13px]"
                      value={s.pricing_mode}
                      onChange={(e) => edit(s.id, { pricing_mode: e.target.value })}
                    >
                      {PRICING.map((p) => (
                        <option key={p} value={p}>
                          {t(`console.catEditor.pricing.${p}`)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[12px] font-medium text-ink-2">
                      {t("console.catEditor.leadTime")}
                    </span>
                    <input
                      type="number"
                      min={0}
                      className="field text-[13px]"
                      value={s.lead_time_hours}
                      onChange={(e) => edit(s.id, { lead_time_hours: Number(e.target.value) })}
                    />
                  </label>
                  {s.pricing_mode === "fixed" && (
                    <>
                      <label className="block">
                        <span className="mb-1 block text-[12px] font-medium text-ink-2">
                          {t("console.catEditor.price")}
                        </span>
                        <input
                          type="number"
                          min={0}
                          step={500}
                          className="field text-[13px]"
                          value={s.base_price ?? ""}
                          onChange={(e) =>
                            edit(s.id, {
                              base_price: e.target.value === "" ? null : Number(e.target.value),
                            })
                          }
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-[12px] font-medium text-ink-2">
                          {t("console.catEditor.unit")}
                        </span>
                        <input
                          className="field text-[13px]"
                          value={s.unit}
                          placeholder={t("console.catEditor.unitPlaceholder")}
                          onChange={(e) => edit(s.id, { unit: e.target.value })}
                        />
                      </label>
                    </>
                  )}
                </div>
                <button
                  onClick={() => save(s)}
                  disabled={savingId === s.id}
                  className="press mt-4 flex h-10 items-center justify-center gap-2 rounded-full bg-ink px-5 text-[13px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
                >
                  {savingId === s.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : savedId === s.id ? (
                    <Check className="h-4 w-4" />
                  ) : null}
                  {savedId === s.id ? t("console.action.saved") : t("console.action.save")}
                </button>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
