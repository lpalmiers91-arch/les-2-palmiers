"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";

type Extra = { label: string; value: string };
export type StayInfo = {
  apartment_id: string;
  wifi_ssid: string;
  wifi_password: string;
  house_manual: string;
  checkin_notes: string;
  checkout_notes: string;
  emergency_contact: string;
  extras: Extra[];
};

export function StayInfoForm({
  apartmentName,
  initial,
}: {
  apartmentName: string;
  initial: StayInfo;
}) {
  const router = useRouter();
  const { t } = useT();
  const [s, setS] = useState<StayInfo>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function f<K extends keyof StayInfo>(k: K, v: StayInfo[K]) {
    setS((p) => ({ ...p, [k]: v }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const { error } = await createClient()
      .from("stay_info")
      .upsert({
        apartment_id: s.apartment_id,
        wifi_ssid: s.wifi_ssid || null,
        wifi_password: s.wifi_password || null,
        house_manual: s.house_manual || null,
        checkin_notes: s.checkin_notes || null,
        checkout_notes: s.checkout_notes || null,
        emergency_contact: s.emergency_contact || null,
        extras: s.extras.filter((x) => x.label || x.value),
      });
    setSaving(false);
    if (!error) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    }
  }

  return (
    <form
      onSubmit={save}
      className="rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6"
    >
      <h2 className="display text-[1.15rem] text-ink">{apartmentName}</h2>
      <p className="mt-1 text-[13px] text-ink-3">{t("console.stayForm.visibility")}</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <L label={t("console.stayForm.wifiName")}>
          <input className="field" value={s.wifi_ssid} onChange={(e) => f("wifi_ssid", e.target.value)} />
        </L>
        <L label={t("console.stayForm.wifiPassword")}>
          <input
            className="field"
            value={s.wifi_password}
            onChange={(e) => f("wifi_password", e.target.value)}
          />
        </L>
        <L label={t("console.stayForm.emergency")} full>
          <input
            className="field"
            value={s.emergency_contact}
            onChange={(e) => f("emergency_contact", e.target.value)}
            placeholder={t("console.stayForm.emergencyPlaceholder")}
          />
        </L>
        <L label={t("console.stayForm.checkinNotes")} full>
          <textarea
            className="field min-h-[80px] resize-y"
            value={s.checkin_notes}
            onChange={(e) => f("checkin_notes", e.target.value)}
          />
        </L>
        <L label={t("console.stayForm.checkoutNotes")} full>
          <textarea
            className="field min-h-[80px] resize-y"
            value={s.checkout_notes}
            onChange={(e) => f("checkout_notes", e.target.value)}
          />
        </L>
        <L label={t("console.stayForm.houseManual")} full>
          <textarea
            className="field min-h-[120px] resize-y"
            value={s.house_manual}
            onChange={(e) => f("house_manual", e.target.value)}
            placeholder={t("console.stayForm.houseManualPlaceholder")}
          />
        </L>
      </div>

      <div className="mt-4">
        <span className="mb-1.5 block text-[13px] font-medium text-ink-2">
          {t("console.stayForm.otherInfo")}
        </span>
        <div className="space-y-2">
          {s.extras.map((x, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="field flex-1"
                placeholder={t("console.stayForm.extraLabel")}
                value={x.label}
                onChange={(e) =>
                  f(
                    "extras",
                    s.extras.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)),
                  )
                }
              />
              <input
                className="field flex-1"
                placeholder={t("console.stayForm.extraValue")}
                value={x.value}
                onChange={(e) =>
                  f(
                    "extras",
                    s.extras.map((y, j) => (j === i ? { ...y, value: e.target.value } : y)),
                  )
                }
              />
              <button
                type="button"
                onClick={() => f("extras", s.extras.filter((_, j) => j !== i))}
                className="press p-2 text-ink-3 hover:text-danger"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => f("extras", [...s.extras, { label: "", value: "" }])}
            className="press flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[12.5px] text-ink-2 hover:border-ink/30"
          >
            <Plus className="h-3.5 w-3.5" /> {t("console.action.add")}
          </button>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="press flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-6 text-[13.5px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saved ? (
            <>
              <Check className="h-4 w-4" /> {t("console.action.saved")}
            </>
          ) : (
            t("console.action.save")
          )}
        </button>
        <button
          type="button"
          onClick={async () => {
            if (!confirm(t("console.stayForm.deleteConfirm"))) return;
            await createClient().rpc("delete_stay_info", { p_apartment: s.apartment_id });
            setS((p) => ({
              ...p,
              wifi_ssid: "",
              wifi_password: "",
              house_manual: "",
              checkin_notes: "",
              checkout_notes: "",
              emergency_contact: "",
              extras: [],
            }));
            router.refresh();
          }}
          className="press flex h-11 items-center gap-1.5 rounded-full border border-line px-4 text-[13px] font-medium text-ink-2 hover:border-danger/40 hover:text-danger"
        >
          <Trash2 className="h-4 w-4" /> {t("console.stayForm.delete")}
        </button>
      </div>
    </form>
  );
}

function L({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
      {children}
    </label>
  );
}
