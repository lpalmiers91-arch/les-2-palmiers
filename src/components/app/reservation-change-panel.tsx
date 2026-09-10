"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, XCircle, Loader2, Check, RotateCcw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n/provider";

export type ChangeRequest = {
  id: string;
  kind: "cancel" | "dates";
  status: "pending" | "approved" | "declined" | "withdrawn";
  new_range: string | null;
  reason: string | null;
  staff_note: string | null;
  created_at: string;
};

export function ReservationChangePanel({
  reservationId,
  start,
  end,
  request,
  allowCancel = true,
}: {
  reservationId: string;
  start: string;
  end: string;
  request: ChangeRequest | null;
  allowCancel?: boolean;
}) {
  const { t } = useT();
  const router = useRouter();
  const [mode, setMode] = useState<null | "cancel" | "dates">(null);
  const [reason, setReason] = useState("");
  const [ns, setNs] = useState(start);
  const [ne, setNe] = useState(end);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  async function submit() {
    setErr(null);
    setBusy(true);
    try {
      const payload =
        mode === "dates"
          ? { p_reservation: reservationId, p_kind: "dates", p_reason: reason.trim() || undefined, p_new_range: `[${ns},${ne})` }
          : { p_reservation: reservationId, p_kind: "cancel", p_reason: reason.trim() || undefined };
      const { error } = await createClient().rpc("request_reservation_change", payload);
      if (error) throw error;
      setMode(null);
      router.refresh();
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      setErr(
        /bad_range|range_in_past/.test(m)
          ? t("resChange.errRange")
          : /not_changeable/.test(m)
            ? t("resChange.errNotChangeable")
            : t("resChange.errGeneric"),
      );
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    if (!request) return;
    setBusy(true);
    await createClient().rpc("withdraw_reservation_change", { p_id: request.id });
    setBusy(false);
    router.refresh();
  }

  if (request && request.status === "pending") {
    return (
      <div className="rounded-[var(--radius-lg)] border border-brass/40 bg-brass/[0.06] p-5">
        <p className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
          <CalendarClock className="h-4 w-4 text-brass-2" />
          {request.kind === "cancel" ? t("resChange.pendingCancel") : t("resChange.pendingDates")}
        </p>
        {request.kind === "dates" && request.new_range && (
          <p className="mt-1 text-[13px] text-ink-2">
            {t("resChange.requestedDates")} {fmtRange(request.new_range)}
          </p>
        )}
        <p className="mt-1 text-[12.5px] text-ink-3">{t("resChange.pendingHint")}</p>
        <button
          onClick={withdraw}
          disabled={busy}
          className="press mt-3 inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-bone px-4 text-[12.5px] font-medium text-ink-2 hover:border-ink/25 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
          {t("resChange.withdraw")}
        </button>
      </div>
    );
  }

  if (request && (request.status === "declined" || request.status === "approved")) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-5">
        <p className="flex items-center gap-2 text-[13.5px] font-medium text-ink">
          {request.status === "approved" ? (
            <Check className="h-4 w-4 text-green-2" />
          ) : (
            <XCircle className="h-4 w-4 text-ink-3" />
          )}
          {request.status === "approved" ? t("resChange.approved") : t("resChange.declined")}
        </p>
        {request.staff_note && <p className="mt-1 text-[13px] text-ink-2">{request.staff_note}</p>}
      </div>
    );
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-5">
      <h3 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
        {t("resChange.title")}
      </h3>

      {mode === null && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => setMode("dates")}
            className="press inline-flex h-10 items-center gap-1.5 rounded-full border border-line px-4 text-[13px] font-medium text-ink hover:border-ink/25"
          >
            <CalendarClock className="h-4 w-4" /> {t("resChange.askDates")}
          </button>
          {allowCancel && (
            <button
              onClick={() => setMode("cancel")}
              className="press inline-flex h-10 items-center gap-1.5 rounded-full border border-line px-4 text-[13px] font-medium text-danger hover:border-danger/40"
            >
              <XCircle className="h-4 w-4" /> {t("resChange.askCancel")}
            </button>
          )}
        </div>
      )}

      {mode !== null && (
        <div className="mt-4 space-y-3">
          {mode === "dates" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[12.5px] text-ink-2">{t("resChange.newCheckin")}</span>
                <input type="date" className="field tnum" min={today} value={ns} onChange={(e) => setNs(e.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[12.5px] text-ink-2">{t("resChange.newCheckout")}</span>
                <input type="date" className="field tnum" min={ns || today} value={ne} onChange={(e) => setNe(e.target.value)} />
              </label>
            </div>
          )}
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] text-ink-2">
              {mode === "cancel" ? t("resChange.cancelReason") : t("resChange.noteOptional")}
            </span>
            <textarea
              className="field h-auto resize-y py-2.5"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          {mode === "cancel" && (
            <p className="rounded-[10px] bg-bone-2 px-3 py-2 text-[12px] text-ink-3">
              {t("resChange.cancelPolicyNote")}
            </p>
          )}
          {err && <p className="text-[12.5px] text-danger">{err}</p>}
          <div className="flex gap-2">
            <button
              onClick={submit}
              disabled={busy}
              className="press inline-flex h-10 items-center gap-2 rounded-full bg-ink px-5 text-[13px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("resChange.sendRequest")}
            </button>
            <button
              onClick={() => {
                setMode(null);
                setErr(null);
              }}
              className="press inline-flex h-10 items-center rounded-full border border-line px-4 text-[13px] font-medium text-ink-2 hover:border-ink/25"
            >
              {t("resChange.back")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function fmtRange(range: string): string {
  const m = range.match(/[[(]"?([\d-]+)"?,\s*"?([\d-]+)"?[)\]]/);
  if (!m) return range;
  return `${formatDate(m[1], { day: "numeric", month: "short" })} — ${formatDate(m[2], { day: "numeric", month: "short" })}`;
}
