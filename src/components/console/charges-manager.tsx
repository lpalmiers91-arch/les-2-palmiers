"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Loader2, Plus, Check, X, Receipt, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ensureRealtimeAuth } from "@/lib/supabase/realtime";
import { formatXOF, formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n/provider";

export type ManagedCharge = {
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

const KINDS = ["deposit", "utility", "cleaning", "damage", "service", "other"] as const;
const KIND_KEY: Record<string, string> = {
  deposit: "charges.kind.deposit",
  utility: "charges.kind.utility",
  cleaning: "charges.kind.cleaning",
  damage: "charges.kind.damage",
  service: "charges.kind.service",
  other: "charges.kind.other",
};

export function ChargesManager({
  reservationId,
  initial,
}: {
  reservationId: string;
  initial: ManagedCharge[];
}) {
  const { t } = useT();
  const router = useRouter();
  const [rows, setRows] = useState<ManagedCharge[]>(initial);
  const [adding, setAdding] = useState(false);

  useEffect(() => setRows(initial), [initial]);

  useEffect(() => {
    let alive = true;
    let ch: RealtimeChannel | null = null;
    ensureRealtimeAuth().then((supabase) => {
      if (!alive) return;
      ch = supabase
        .channel(`charges-mgr-${reservationId}-${Math.random().toString(36).slice(2)}`)
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

  const total = rows.reduce((s, r) => s + r.amount, 0);
  const outstanding = rows.filter((r) => r.status === "pending").reduce((s, r) => s + r.amount, 0);

  return (
    <section className="rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
          <Wallet className="h-3.5 w-3.5" /> {t("console.charges.title")}
        </h2>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="press inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[12.5px] font-medium text-ink-2 hover:border-ink/30"
          >
            <Plus className="h-3.5 w-3.5" /> {t("console.charges.add")}
          </button>
        )}
      </div>

      {adding && (
        <AddCharge
          reservationId={reservationId}
          onDone={() => {
            setAdding(false);
            router.refresh();
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {rows.length === 0 && !adding ? (
        <p className="mt-3 text-[13px] text-ink-3">{t("console.charges.empty")}</p>
      ) : (
        <ul className="mt-3 divide-y divide-line-soft">
          {rows.map((c) => (
            <ChargeRow key={c.id} charge={c} onChanged={() => router.refresh()} t={t} />
          ))}
        </ul>
      )}

      {rows.length > 0 && (
        <dl className="mt-4 space-y-1.5 border-t border-line pt-3 text-[13px]">
          <div className="flex justify-between">
            <dt className="text-ink-3">{t("console.charges.totalBilled")}</dt>
            <dd className="tnum text-ink">{formatXOF(total)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-ink-3">{t("console.charges.outstanding")}</dt>
            <dd className="tnum font-medium text-ink">{formatXOF(outstanding)}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}

function AddCharge({
  reservationId,
  onDone,
  onCancel,
}: {
  reservationId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { t } = useT();
  const [kind, setKind] = useState<(typeof KINDS)[number]>("deposit");
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    const n = Number(amount);
    if (!label.trim()) return setErr(t("console.charges.labelRequired"));
    if (!n || n <= 0) return setErr(t("console.charges.badAmount"));
    setBusy(true);
    setErr(null);
    try {
      const { error } = await createClient().rpc("staff_add_charge", {
        p_reservation: reservationId,
        p_kind: kind,
        p_label: label.trim(),
        p_amount: n,
        p_note: note.trim() || undefined,
      });
      if (error) throw error;
      onDone();
    } catch {
      setErr(t("console.charges.err"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-4 rounded-[12px] border border-line bg-bone-2/50 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">
            {t("console.charges.kindLabel")}
          </span>
          <select
            className="field"
            value={kind}
            onChange={(e) => setKind(e.target.value as (typeof KINDS)[number])}
          >
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {t(KIND_KEY[k])}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">
            {t("console.charges.amountLabel")}
          </span>
          <input
            type="number"
            className="field tnum"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
          />
        </label>
      </div>
      <label className="mt-3 block">
        <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">
          {t("console.charges.labelLabel")}
        </span>
        <input
          className="field"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder={t("console.charges.labelPlaceholder")}
        />
      </label>
      <label className="mt-3 block">
        <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">
          {t("console.charges.noteLabel")} <span className="text-ink-3">({t("console.charges.optional")})</span>
        </span>
        <input
          className="field"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t("console.charges.notePlaceholder")}
        />
      </label>

      {err && <p className="mt-2 text-[12px] text-danger">{err}</p>}

      <div className="mt-3 flex gap-2">
        <button
          onClick={submit}
          disabled={busy}
          className="press inline-flex h-10 items-center gap-2 rounded-full bg-ink px-5 text-[13px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {t("console.charges.notifyClient")}
        </button>
        <button
          onClick={onCancel}
          className="press inline-flex h-10 items-center rounded-full border border-line px-4 text-[13px] text-ink-2 hover:border-ink/30"
        >
          {t("console.charges.cancel")}
        </button>
      </div>
    </div>
  );
}

function ChargeRow({
  charge,
  onChanged,
  t,
}: {
  charge: ManagedCharge;
  onChanged: () => void;
  t: (k: string, v?: Record<string, string | number>) => string;
}) {
  const [busy, setBusy] = useState(false);

  async function setStatus(status: string) {
    setBusy(true);
    try {
      const { error } = await createClient().rpc("staff_update_charge", {
        p_charge: charge.id,
        p_status: status,
      });
      if (error) throw error;
      onChanged();
    } finally {
      setBusy(false);
    }
  }

  const pill: Record<string, string> = {
    pending: "bg-warn/14 text-warn",
    paid: "bg-green/12 text-green-2",
    waived: "bg-ink/8 text-ink-3",
    refunded: "bg-ink/8 text-ink-3",
  };
  const statusLabel: Record<string, string> = {
    pending: t("charges.status.pending"),
    paid: t("charges.status.paid"),
    waived: t("charges.status.waived"),
    refunded: t("charges.status.refunded"),
  };

  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13.5px] font-medium text-ink">{charge.label}</p>
          <p className="text-[11.5px] text-ink-3">
            {t(KIND_KEY[charge.kind] ?? "charges.kind.other")} · {charge.reference} ·{" "}
            {formatDate(charge.created_at)}
            {charge.note ? ` · ${charge.note}` : ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="tnum text-[14px] font-medium text-ink">{formatXOF(charge.amount)}</p>
          <span
            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10.5px] font-medium ${pill[charge.status] ?? pill.pending}`}
          >
            {statusLabel[charge.status] ?? charge.status}
          </span>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {charge.status === "pending" && (
          <>
            <button
              onClick={() => setStatus("paid")}
              disabled={busy}
              className="press inline-flex h-8 items-center gap-1 rounded-full bg-green px-3 text-[11.5px] font-medium text-bone disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
              {t("console.charges.markPaid")}
            </button>
            <button
              onClick={() => setStatus("waived")}
              disabled={busy}
              className="press inline-flex h-8 items-center gap-1 rounded-full border border-line px-3 text-[11.5px] text-ink-2 disabled:opacity-50"
            >
              <X className="h-3 w-3" /> {t("console.charges.waive")}
            </button>
          </>
        )}
        {charge.status === "paid" && (
          <>
            {charge.payment_ref && (
              <Link
                href={`/recu/${encodeURIComponent(charge.payment_ref)}`}
                target="_blank"
                className="inline-flex items-center gap-1 text-[12px] text-ink-3 underline underline-offset-2 hover:text-ink"
              >
                <Receipt className="h-3 w-3" /> {t("console.charges.receipt")}
              </Link>
            )}
            <button
              onClick={() => setStatus("refunded")}
              disabled={busy}
              className="press inline-flex h-8 items-center rounded-full border border-line px-3 text-[11.5px] text-ink-2 disabled:opacity-50"
            >
              {t("console.charges.refund")}
            </button>
          </>
        )}
      </div>
    </li>
  );
}
