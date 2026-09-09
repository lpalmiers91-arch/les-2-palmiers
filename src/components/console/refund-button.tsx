"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatXOF } from "@/lib/format";
import { useT } from "@/lib/i18n/provider";

export function RefundButton({ paymentId, max }: { paymentId: string; max: number }) {
  const router = useRouter();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(String(max));
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setErr(null);
    const { error } = await createClient().rpc("payment_refund", {
      p_payment: paymentId,
      p_amount: Number(amount),
      p_reason: reason || undefined,
    });
    setBusy(false);
    if (error) setErr(error.message);
    else {
      setOpen(false);
      router.refresh();
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="press h-8 rounded-full border border-line px-3 text-[12px] text-ink-2 hover:border-danger/40"
      >
        {t("console.refund.action")}
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 rounded-[10px] border border-line bg-bone-2 p-2.5">
      <input
        type="number"
        value={amount}
        max={max}
        min={1}
        onChange={(e) => setAmount(e.target.value)}
        className="field tnum h-8 w-32 text-[12px]"
      />
      <input
        placeholder={t("console.refund.reason")}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="field h-8 w-40 text-[12px]"
      />
      <div className="flex gap-1.5">
        <button
          onClick={submit}
          disabled={busy || Number(amount) < 1 || Number(amount) > max}
          className="press h-8 rounded-full bg-danger px-3 text-[12px] font-medium text-bone disabled:opacity-50"
        >
          {formatXOF(Number(amount) || 0)}
        </button>
        <button onClick={() => setOpen(false)} className="press h-8 rounded-full px-3 text-[12px] text-ink-3">
          {t("console.action.cancel")}
        </button>
      </div>
      {err && <p className="text-[11px] text-danger">{err}</p>}
    </div>
  );
}
