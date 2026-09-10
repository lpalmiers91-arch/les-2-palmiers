"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { FUNCTIONS_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";
import { useT } from "@/lib/i18n/provider";

type Apt = { id: string; name: string };

export function ManualBooking({ apartments }: { apartments: Apt[] }) {
  const { t } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [okRef, setOkRef] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      const {
        data: { session },
      } = await createClient().auth.getSession();
      const res = await fetch(`${FUNCTIONS_URL}/staff-booking`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({
          apartment_id: fd.get("apartment_id"),
          start: fd.get("start"),
          end: fd.get("end"),
          guests: Number(fd.get("guests")) || 2,
          guest_email: fd.get("guest_email"),
          guest_name: fd.get("guest_name"),
          guest_phone: fd.get("guest_phone"),
          channel: fd.get("channel"),
          mark_paid: fd.get("mark_paid"),
          note: fd.get("note"),
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        setErr(
          j.error === "dates_unavailable"
            ? t("manualBooking.errDates")
            : j.error === "over_capacity"
              ? t("manualBooking.errCapacity")
              : j.error === "email_invalide"
                ? t("manualBooking.errEmail")
                : t("manualBooking.errGeneric"),
        );
        return;
      }
      setOkRef(j.reference);
      router.refresh();
    } catch {
      setErr(t("manualBooking.errGeneric"));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => {
          setOpen(true);
          setOkRef(null);
          setErr(null);
        }}
        className="press inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[12.5px] font-medium text-bone hover:bg-forest-2"
      >
        <Plus className="h-3.5 w-3.5" /> {t("manualBooking.new")}
      </button>
    );
  }

  return (
    <div className="mb-6 rounded-[var(--radius-lg)] border border-line bg-bone p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-2">
          {t("manualBooking.title")}
        </h2>
        <button onClick={() => setOpen(false)} className="press p-1 text-ink-3 hover:text-ink" aria-label={t("manualBooking.close")}>
          <X className="h-4 w-4" />
        </button>
      </div>

      {okRef ? (
        <div className="mt-4 rounded-[12px] border border-forest/25 bg-forest/[0.04] p-4">
          <p className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
            <Check className="h-4 w-4 text-forest-2" /> {t("manualBooking.done", { ref: okRef })}
          </p>
          <button
            onClick={() => {
              setOkRef(null);
            }}
            className="press mt-3 text-[12.5px] font-medium text-forest-2 hover:text-forest"
          >
            {t("manualBooking.addAnother")}
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-[12.5px] text-ink-2">{t("manualBooking.apartment")}</span>
              <select name="apartment_id" required className="field">
                {apartments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[12.5px] text-ink-2">{t("manualBooking.channel")}</span>
              <select name="channel" className="field" defaultValue="phone">
                <option value="phone">{t("manualBooking.chPhone")}</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">{t("manualBooking.chEmail")}</option>
                <option value="walk_in">{t("manualBooking.chWalkIn")}</option>
                <option value="other">{t("manualBooking.chOther")}</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-[12.5px] text-ink-2">{t("manualBooking.checkin")}</span>
              <input name="start" type="date" required className="field tnum" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12.5px] text-ink-2">{t("manualBooking.checkout")}</span>
              <input name="end" type="date" required className="field tnum" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12.5px] text-ink-2">{t("manualBooking.guestName")}</span>
              <input name="guest_name" required className="field" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12.5px] text-ink-2">{t("manualBooking.guests")}</span>
              <input name="guests" type="number" min={1} max={12} defaultValue={2} className="field tnum" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12.5px] text-ink-2">{t("manualBooking.guestEmail")}</span>
              <input name="guest_email" type="email" required className="field" />
            </label>
            <label className="block">
              <span className="mb-1 block text-[12.5px] text-ink-2">
                {t("manualBooking.guestPhone")} <span className="text-ink-3">({t("manualBooking.optional")})</span>
              </span>
              <input name="guest_phone" type="tel" className="field" />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-[12.5px] text-ink-2">{t("manualBooking.payment")}</span>
            <select name="mark_paid" className="field" defaultValue="none">
              <option value="none">{t("manualBooking.payNone")}</option>
              <option value="deposit">{t("manualBooking.payDeposit")}</option>
              <option value="full">{t("manualBooking.payFull")}</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[12.5px] text-ink-2">
              {t("manualBooking.note")} <span className="text-ink-3">({t("manualBooking.optional")})</span>
            </span>
            <textarea name="note" rows={2} className="field h-auto resize-y py-2" />
          </label>

          <p className="rounded-[8px] bg-bone-2 px-3 py-2 text-[12px] text-ink-3">
            {t("manualBooking.accountNote")}
          </p>

          {err && <p className="text-[12.5px] text-danger">{err}</p>}

          <button
            type="submit"
            disabled={busy}
            className="press inline-flex h-10 items-center gap-2 rounded-full bg-ink px-5 text-[13px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("manualBooking.create")}
          </button>
        </form>
      )}
    </div>
  );
}
