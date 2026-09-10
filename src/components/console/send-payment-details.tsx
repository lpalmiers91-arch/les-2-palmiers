"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Send } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";

export function SendPaymentDetails({
  reservationId,
  suggestedAmount = 0,
}: {
  reservationId: string;
  suggestedAmount?: number;
}) {
  const { t } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(suggestedAmount > 0 ? String(suggestedAmount) : "");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function send() {
    setBusy(true);
    setErr(null);
    try {
      const { error } = await createClient().rpc("staff_send_payment_details", {
        p_reservation: reservationId,
        p_amount: amount ? Number(amount) : undefined,
        p_note: note.trim() || undefined,
      });
      if (error) throw error;
      setDone(true);
      setOpen(false);
      router.refresh();
      setTimeout(() => setDone(false), 3000);
    } catch {
      setErr(t("console.payDetails.err"));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="press inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-[13px] font-medium text-ink-2 hover:border-ink/30"
      >
        {done ? <Check className="h-4 w-4 text-green-2" /> : <Send className="h-4 w-4" />}
        {done ? t("console.payDetails.sent") : t("console.payDetails.cta")}
      </button>
    );
  }

  return (
    <div className="rounded-[12px] border border-line bg-bone-2/50 p-4">
      <p className="text-[13px] font-medium text-ink">{t("console.payDetails.title")}</p>
      <p className="mt-1 text-[12.5px] text-ink-3">{t("console.payDetails.help")}</p>
      <label className="mt-3 block">
        <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">
          {t("console.payDetails.amount")} <span className="text-ink-3">({t("console.charges.optional")})</span>
        </span>
        <input
          type="number"
          className="field tnum"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0"
        />
      </label>
      <label className="mt-3 block">
        <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">
          {t("console.payDetails.note")} <span className="text-ink-3">({t("console.charges.optional")})</span>
        </span>
        <input
          className="field"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("console.payDetails.notePlaceholder")}
        />
      </label>
      {err && <p className="mt-2 text-[12px] text-danger">{err}</p>}
      <div className="mt-3 flex gap-2">
        <button
          onClick={send}
          disabled={busy}
          className="press inline-flex h-10 items-center gap-2 rounded-full bg-ink px-5 text-[13px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {t("console.payDetails.send")}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="press inline-flex h-10 items-center rounded-full border border-line px-4 text-[13px] text-ink-2 hover:border-ink/30"
        >
          {t("console.charges.cancel")}
        </button>
      </div>
    </div>
  );
}
