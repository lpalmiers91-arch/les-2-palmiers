"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";

type Account = { id: string; kind: string; label: string; value: string };

const KIND_LABEL: Record<string, string> = {
  momo: "MTN MoMo",
  flooz: "Moov Flooz",
  celtis: "Celtiis Cash",
  bank: "Virement bancaire",
  card: "Carte bancaire",
  crypto: "Cryptomonnaie",
  other: "Autre",
};

export function SendPaymentRequest({
  conversationId,
  accounts,
}: {
  conversationId: string;
  accounts: Account[];
}) {
  const { t } = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>(accounts.map((a) => a.id));
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function toggle(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  async function send() {
    setBusy(true);
    setErr(null);
    try {
      const { error } = await createClient().rpc("staff_send_payment_request", {
        p_conversation: conversationId,
        p_account_ids: picked,
        p_amount: amount ? Number(amount) : undefined,
        p_note: note.trim() || undefined,
      });
      if (error) throw error;
      setSent(true);
      setOpen(false);
      router.refresh();
      setTimeout(() => setSent(false), 3000);
    } catch {
      setErr(t("console.payReq.err"));
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="press inline-flex h-9 items-center gap-2 rounded-full border border-line bg-bone px-3.5 text-[12.5px] font-medium text-ink-2 hover:border-ink/30"
      >
        {sent ? <Check className="h-3.5 w-3.5 text-green-2" /> : <Wallet className="h-3.5 w-3.5" />}
        {sent ? t("console.payReq.sent") : t("console.payReq.cta")}
      </button>
    );
  }

  return (
    <div className="rounded-[12px] border border-line bg-bone p-4">
      <p className="text-[13px] font-medium text-ink">{t("console.payReq.title")}</p>

      {accounts.length === 0 ? (
        <p className="mt-2 text-[12.5px] text-ink-3">{t("console.payReq.noAccounts")}</p>
      ) : (
        <div className="mt-3 space-y-1.5">
          {accounts.map((a) => (
            <label key={a.id} className="flex cursor-pointer items-center gap-2.5 rounded-[10px] border border-line-soft px-3 py-2 text-[12.5px]">
              <input
                type="checkbox"
                checked={picked.includes(a.id)}
                onChange={() => toggle(a.id)}
                className="h-4 w-4 accent-forest"
              />
              <span className="min-w-0">
                <span className="font-medium text-ink">{KIND_LABEL[a.kind] ?? a.kind}</span>{" "}
                <span className="text-ink-3">— {a.label}</span>
                <span className="tnum block text-[11.5px] text-ink-2">{a.value}</span>
              </span>
            </label>
          ))}
        </div>
      )}

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium text-ink-2">
            {t("console.payReq.amount")} <span className="text-ink-3">({t("console.charges.optional")})</span>
          </span>
          <input type="number" className="field tnum" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium text-ink-2">
            {t("console.payReq.note")} <span className="text-ink-3">({t("console.charges.optional")})</span>
          </span>
          <input className="field" value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
      </div>

      {err && <p className="mt-2 text-[12px] text-danger">{err}</p>}

      <div className="mt-3 flex gap-2">
        <button
          onClick={send}
          disabled={busy || (accounts.length > 0 && picked.length === 0)}
          className="press inline-flex h-10 items-center gap-2 rounded-full bg-ink px-5 text-[13px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
          {t("console.payReq.send")}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="press inline-flex h-10 items-center rounded-full border border-line px-4 text-[13px] text-ink-2 hover:border-ink/30"
        >
          {t("console.payReq.cancel")}
        </button>
      </div>
    </div>
  );
}
