"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Wallet, Loader2, Check, Upload, Plus, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ensureRealtimeAuth } from "@/lib/supabase/realtime";
import { formatXOF, formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n/provider";

export type LedgerEntry = {
  id: string;
  kind: string;
  amount: number;
  balance_after: number;
  note: string | null;
  created_at: string;
};

const PRESETS = [10000, 25000, 50000, 100000];
const METHODS = ["mtn", "moov", "celtis", "card"] as const;

export function WalletPanel({
  userId,
  balance,
  ledger,
}: {
  userId: string;
  balance: number;
  ledger: LedgerEntry[];
}) {
  const { t } = useT();
  const router = useRouter();
  const [bal, setBal] = useState(balance);
  const [rows, setRows] = useState<LedgerEntry[]>(ledger);

  useEffect(() => {
    setBal(balance);
    setRows(ledger);
  }, [balance, ledger]);

  useEffect(() => {
    let alive = true;
    let ch: RealtimeChannel | null = null;
    ensureRealtimeAuth().then((supabase) => {
      if (!alive) return;
      ch = supabase
        .channel(`wallet-${userId}-${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "wallet_accounts", filter: `user_id=eq.${userId}` },
          () => router.refresh(),
        )
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "wallet_ledger", filter: `user_id=eq.${userId}` },
          () => router.refresh(),
        )
        .subscribe();
    });
    return () => {
      alive = false;
      if (ch) createClient().removeChannel(ch);
    };
  }, [userId, router]);

  return (
    <div className="space-y-5">
      <div className="rounded-[var(--radius-lg)] border border-forest/25 bg-forest/[0.04] p-6">
        <p className="flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.16em] text-forest-2">
          <Wallet className="h-3.5 w-3.5" /> {t("wallet.balance")}
        </p>
        <p className="tnum display mt-2 text-[2.2rem] text-ink">{formatXOF(bal)}</p>
        <p className="mt-1 text-[12.5px] text-ink-3">{t("wallet.balanceHint")}</p>
      </div>

      <TopUp />

      <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
          {t("wallet.history")}
        </h2>
        {rows.length === 0 ? (
          <p className="mt-3 text-[13px] text-ink-3">{t("wallet.historyEmpty")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-line-soft">
            {rows.map((e) => {
              const credit = e.kind === "topup" || e.kind === "refund" || (e.kind === "adjust" && e.amount >= 0);
              return (
                <li key={e.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        credit ? "bg-green/12 text-green-2" : "bg-ink/8 text-ink-3"
                      }`}
                    >
                      {credit ? (
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      ) : (
                        <ArrowDownRight className="h-3.5 w-3.5" />
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] text-ink">
                        {e.note ?? t(`wallet.kind.${e.kind}`)}
                      </p>
                      <p className="text-[11.5px] text-ink-3">{formatDate(e.created_at)}</p>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`tnum text-[13.5px] font-medium ${credit ? "text-green-2" : "text-ink"}`}>
                      {credit ? "+" : "−"}
                      {formatXOF(e.amount)}
                    </p>
                    <p className="tnum text-[11px] text-ink-3">{formatXOF(e.balance_after)}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function TopUp() {
  const { t } = useT();
  const router = useRouter();
  const [amount, setAmount] = useState(25000);
  const [method, setMethod] = useState<(typeof METHODS)[number]>("mtn");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [proofPath, setProofPath] = useState<string | null>(null);
  const [proofName, setProofName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState("");
  const [proofDone, setProofDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    setErr(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user!.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("payment-proofs")
        .upload(path, file, { contentType: file.type });
      if (error) throw error;
      setProofPath(path);
      setProofName(file.name);
    } catch {
      setErr(t("wallet.uploadErr"));
    } finally {
      setUploading(false);
    }
  }

  async function submitProof() {
    if (amount < 500) return setErr(t("wallet.amountTooLow"));
    if (!proofPath) return setErr(t("wallet.needProof"));
    setBusy(true);
    setErr(null);
    try {
      const { error } = await createClient().rpc("payment_submit_proof", {
        p_purpose: "wallet",
        p_target: null as unknown as string,
        p_method: method,
        p_amount: amount,
        p_proof_path: proofPath,
        p_note: note || undefined,
      });
      if (error) throw error;
      setProofDone(true);
      router.refresh();
    } catch {
      setErr(t("wallet.err"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
        {t("wallet.topUp")}
      </h2>

      {proofDone ? (
        <div className="mt-4 text-center">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warn/15 text-warn">
            <Upload className="h-5 w-5" />
          </span>
          <p className="mt-3 text-[15px] font-medium text-ink">{t("wallet.proofSentT")}</p>
          <p className="mt-1 text-[13px] text-ink-3">{t("wallet.proofSentB")}</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <p className="rounded-[10px] bg-bone-2 px-3 py-2 text-[12.5px] text-ink-3">
            {t("wallet.rechargeHelp")}
          </p>
          <div>
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{t("wallet.amount")}</span>
            <div className="grid grid-cols-4 gap-2">
              {PRESETS.map((a) => (
                <button
                  key={a}
                  onClick={() => setAmount(a)}
                  className={`press tnum rounded-[10px] border py-2 text-[12.5px] font-medium transition-colors ${
                    amount === a ? "border-forest bg-forest/[0.05] text-ink" : "border-line text-ink-2"
                  }`}
                >
                  {(a / 1000).toLocaleString("fr-FR")}k
                </button>
              ))}
            </div>
            <input
              type="number"
              min={500}
              step={500}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              className="field tnum mt-2"
            />
          </div>

          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{t("wallet.method")}</span>
            <select
              className="field"
              value={method}
              onChange={(e) => setMethod(e.target.value as (typeof METHODS)[number])}
            >
              {METHODS.map((m) => (
                <option key={m} value={m}>
                  {m === "card" ? t("payPanel.card") : m.toUpperCase()}
                </option>
              ))}
            </select>
          </label>

          <div>
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">
              {t("wallet.screenshot")}
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*,application/pdf"
              className="hidden"
              onChange={upload}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="press flex h-11 w-full items-center justify-center gap-2 rounded-[11px] border border-dashed border-line text-[13px] text-ink-2 hover:border-ink/30 disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : proofName ? (
                <>
                  <Check className="h-4 w-4 text-green-2" /> {proofName}
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" /> {t("wallet.chooseFile")}
                </>
              )}
            </button>
          </div>
          <input
            className="field"
            placeholder={t("wallet.notePlaceholder")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />

          {err && <p className="text-[12.5px] text-danger">{err}</p>}

          <button
            onClick={submitProof}
            disabled={busy}
            className="press flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-[14px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {t("wallet.sendProof")}
          </button>
        </div>
      )}

      <p className="mt-4 border-t border-line-soft pt-3 text-[12px] text-ink-3">
        {t("wallet.footNote")}{" "}
        <Link href="/app/reservations" className="underline underline-offset-2 hover:text-ink">
          {t("wallet.footLink")}
        </Link>
      </p>
    </div>
  );
}
