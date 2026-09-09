"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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
      <p className="mt-1 text-[13px] text-ink-3">
        Visible par le client uniquement pendant qu&apos;il a une réservation active.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <L label="Nom du réseau Wi-Fi">
          <input className="field" value={s.wifi_ssid} onChange={(e) => f("wifi_ssid", e.target.value)} />
        </L>
        <L label="Mot de passe Wi-Fi">
          <input
            className="field"
            value={s.wifi_password}
            onChange={(e) => f("wifi_password", e.target.value)}
          />
        </L>
        <L label="Contact d'urgence" full>
          <input
            className="field"
            value={s.emergency_contact}
            onChange={(e) => f("emergency_contact", e.target.value)}
            placeholder="Nom + numéro"
          />
        </L>
        <L label="Consignes d'arrivée" full>
          <textarea
            className="field min-h-[80px] resize-y"
            value={s.checkin_notes}
            onChange={(e) => f("checkin_notes", e.target.value)}
          />
        </L>
        <L label="Consignes de départ" full>
          <textarea
            className="field min-h-[80px] resize-y"
            value={s.checkout_notes}
            onChange={(e) => f("checkout_notes", e.target.value)}
          />
        </L>
        <L label="Manuel de la maison" full>
          <textarea
            className="field min-h-[120px] resize-y"
            value={s.house_manual}
            onChange={(e) => f("house_manual", e.target.value)}
            placeholder="Chauffe-eau, poubelles, climatisation, télé…"
          />
        </L>
      </div>

      <div className="mt-4">
        <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Autres infos</span>
        <div className="space-y-2">
          {s.extras.map((x, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="field flex-1"
                placeholder="Libellé"
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
                placeholder="Valeur"
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
            <Plus className="h-3.5 w-3.5" /> Ajouter
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="press mt-5 flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-6 text-[13.5px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
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

function L({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
      {children}
    </label>
  );
}
