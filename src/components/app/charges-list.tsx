"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Loader2, Check, Upload, Wallet, Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ensureRealtimeAuth } from "@/lib/supabase/realtime";
import { formatXOF, formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n/provider";

export type Charge = {
  id: string;
  reference: string;
  kind: string;
  label: string;
  amount: number;
  status: string;
  note: string | null;
  created_at: string;
  payment_ref?: string | null;
};

const KIND_KEY: Record<string, string> = {
  deposit: "charges.kind.deposit",
  utility: "charges.kind.utility",
  cleaning: "charges.kind.cleaning",
  damage: "charges.kind.damage",
  service: "charges.kind.service",
  other: "charges.kind.other",
};

export function ChargesList({
  reservationId,
  initial,
}: {
  reservationId: string;
  initial: Charge[];
}) {
  const { t } = useT();
  const router = useRouter();
  const [rows, setRows] = useState<Charge[]>(initial);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => setRows(initial), [initial]);

  useEffect(() => {
    let alive = true;
    let ch: RealtimeChannel | null = null;
    ensureRealtimeAuth().then((supabase) => {
      if (!alive) return;
      ch = supabase
        .channel(`charges-${reservationId}-${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "reservation_charges",
            filter: `reservation_id=eq.${reservationId}`,
          },
          () => router.refresh(),
        )
        .subscribe();
    });
    return () => {
      alive = false;
      if (ch) createClient().removeChannel(ch);
    };
  }, [reservationId, router]);

  if (rows.length === 0) return null;

  const pendingTotal = rows.filter((r) => r.status === "pending").reduce((s, r) => s + r.amount, 0);

  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
          <Wallet className="h-3.5 w-3.5" /> {t("charges.title")}
        </h2>
        {pendingTotal > 0 && (
          <span className="tnum text-[13px] font-medium text-brass-2">
            {t("charges.dueTotal", { amount: formatXOF(pendingTotal) })}
          </span>
        )}
      </div>

      <ul className="mt-3 divide-y divide-line-soft">
        {rows.map((c) => (
          <li key={c.id} className="py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[13.5px] font-medium text-ink">{c.label}</p>
                <p className="text-[11.5px] text-ink-3">
                  {t(KIND_KEY[c.kind] ?? "charges.kind.other")} · {formatDate(c.created_at)}
                  {c.note ? ` · ${c.note}` : ""}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="tnum text-[14px] font-medium text-ink">{formatXOF(c.amount)}</p>
                <StatusPill status={c.status} t={t} />
              </div>
            </div>

            {c.status === "pending" && (
              <div className="mt-2">
                {openId === c.id ? (
                  <ChargePay
                    charge={c}
                    onDone={() => {
                      setOpenId(null);
                      router.refresh();
                    }}
                    onCancel={() => setOpenId(null)}
                  />
                ) : (
                  <button
                    onClick={() => setOpenId(c.id)}
                    className="press inline-flex h-8 items-center rounded-full bg-ink px-4 text-[12px] font-medium text-bone hover:bg-forest-2"
                  >
                    {t("charges.pay")}
                  </button>
                )}
              </div>
            )}
            {c.status === "paid" && c.payment_ref && (
              <Link
                href={`/recu/${encodeURIComponent(c.payment_ref)}`}
                target="_blank"
                className="mt-1.5 inline-flex items-center gap-1 text-[12px] text-ink-3 underline underline-offset-2 hover:text-ink"
              >
                <Receipt className="h-3 w-3" /> {t("charges.receipt")}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusPill({ status, t }: { status: string; t: (k: string) => string }) {
  const map: Record<string, string> = {
    pending: "bg-warn/14 text-warn",
    paid: "bg-green/12 text-green-2",
    waived: "bg-ink/8 text-ink-3",
    refunded: "bg-ink/8 text-ink-3",
  };
  const label: Record<string, string> = {
    pending: t("charges.status.pending"),
    paid: t("charges.status.paid"),
    waived: t("charges.status.waived"),
    refunded: t("charges.status.refunded"),
  };
  return (
    <span
      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10.5px] font-medium ${map[status] ?? map.pending}`}
    >
      {label[status] ?? status}
    </span>
  );
}

const METHODS = ["mtn", "moov", "celtis", "card"] as const;

function ChargePay({
  charge,
  onDone,
  onCancel,
}: {
  charge: Charge;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { t } = useT();
  const [tab, setTab] = useState<"sim" | "proof">("sim");
  const [method, setMethod] = useState<(typeof METHODS)[number]>("mtn");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [proofPath, setProofPath] = useState<string | null>(null);
  const [proofName, setProofName] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function paySim(outcome: "success" | "failed" | "pending") {
    setBusy(true);
    setErr(null);
    try {
      const { error } = await createClient().rpc("charge_pay_sim", {
        p_charge: charge.id,
        p_method: method,
        p_outcome: outcome,
      });
      if (error) throw error;
      onDone();
    } catch {
      setErr(t("charges.err"));
    } finally {
      setBusy(false);
    }
  }

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
      setErr(t("charges.uploadErr"));
    } finally {
      setUploading(false);
    }
  }

  async function submitProof() {
    if (!proofPath) return setErr(t("charges.needProof"));
    setBusy(true);
    setErr(null);
    try {
      const { error } = await createClient().rpc("payment_submit_proof", {
        p_purpose: "charge",
        p_target: charge.id,
        p_method: method,
        p_amount: charge.amount,
        p_proof_path: proofPath,
        p_note: note || undefined,
      });
      if (error) throw error;
      onDone();
    } catch {
      setErr(t("charges.err"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-1 rounded-[10px] border border-line bg-bone-2/50 p-3">
      <div className="flex gap-1.5">
        {(["sim", "proof"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`press rounded-full px-3 py-1 text-[11.5px] font-medium ${
              tab === k ? "bg-ink text-bone" : "border border-line text-ink-2"
            }`}
          >
            {k === "sim" ? t("charges.tabSim") : t("charges.tabProof")}
          </button>
        ))}
      </div>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {METHODS.map((m) => (
          <button
            key={m}
            onClick={() => setMethod(m)}
            className={`press rounded-full px-2.5 py-1 text-[11px] ${
              method === m ? "bg-forest text-bone" : "border border-line text-ink-2"
            }`}
          >
            {m === "card" ? t("payPanel.card") : m.toUpperCase()}
          </button>
        ))}
      </div>

      {tab === "sim" ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          <button
            onClick={() => paySim("success")}
            disabled={busy}
            className="press inline-flex h-8 items-center gap-1 rounded-full bg-green px-3 text-[11.5px] font-medium text-bone disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            {t("charges.simSuccess")}
          </button>
          <button
            onClick={() => paySim("failed")}
            disabled={busy}
            className="press inline-flex h-8 items-center rounded-full border border-line px-3 text-[11.5px] text-ink-2 disabled:opacity-50"
          >
            {t("charges.simFail")}
          </button>
        </div>
      ) : (
        <div className="mt-2.5">
          <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={upload} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="press inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-[11.5px] font-medium text-ink-2"
          >
            {uploading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : proofName ? (
              <Check className="h-3 w-3 text-green-2" />
            ) : (
              <Upload className="h-3 w-3" />
            )}
            {proofName ?? t("charges.attachProof")}
          </button>
          <input
            className="field mt-2 h-8 text-[12px]"
            placeholder={t("charges.notePlaceholder")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <button
            onClick={submitProof}
            disabled={busy || !proofPath}
            className="press mt-2 inline-flex h-8 items-center gap-1 rounded-full bg-ink px-3 text-[11.5px] font-medium text-bone disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            {t("charges.sendProof")}
          </button>
        </div>
      )}

      {err && <p className="mt-2 text-[11.5px] text-danger">{err}</p>}
      <button onClick={onCancel} className="mt-2 block text-[11px] text-ink-3 hover:text-ink">
        {t("charges.cancel")}
      </button>
    </div>
  );
}
