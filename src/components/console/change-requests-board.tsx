"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, XCircle, Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n/provider";

export type PendingChange = {
  id: string;
  kind: "cancel" | "dates";
  reason: string | null;
  new_range: string | null;
  created_at: string;
  reservation_ref: string;
  guest_name: string | null;
  current_range: string;
};

function fmtRange(range: string): string {
  const m = range.match(/[[(]"?([\d-]+)"?,\s*"?([\d-]+)"?[)\]]/);
  if (!m) return range;
  return `${formatDate(m[1], { day: "numeric", month: "short" })} — ${formatDate(m[2], { day: "numeric", month: "short", year: "numeric" })}`;
}

export function ChangeRequestsBoard({ rows: initial }: { rows: PendingChange[] }) {
  const { t } = useT();
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);

  async function resolve(id: string, approve: boolean) {
    setErr(null);
    setBusy(id);
    const { error } = await createClient().rpc("resolve_reservation_change", {
      p_id: id,
      p_approve: approve,
      p_note: note.trim() || undefined,
    });
    setBusy(null);
    if (error) {
      setErr(/dates_unavailable/.test(error.message) ? t("resChange.staffConflict") : t("resChange.errGeneric"));
      return;
    }
    setRows((r) => r.filter((x) => x.id !== id));
    setNoteFor(null);
    setNote("");
    router.refresh();
  }

  if (rows.length === 0) return null;

  return (
    <div className="mb-6 rounded-[var(--radius-lg)] border border-brass/40 bg-brass/[0.05] p-5">
      <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-2">
        <CalendarClock className="h-4 w-4 text-brass-2" /> {t("resChange.staffTitle")} ({rows.length})
      </h2>
      <ul className="mt-4 space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded-[12px] border border-line bg-bone p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[13.5px] font-medium text-ink">
                  {r.kind === "cancel" ? (
                    <span className="inline-flex items-center gap-1.5 text-danger">
                      <XCircle className="h-3.5 w-3.5" /> {t("resChange.kindCancel")}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-ink">
                      <CalendarClock className="h-3.5 w-3.5" /> {t("resChange.kindDates")}
                    </span>
                  )}
                </p>
                <p className="mt-1 text-[12.5px] text-ink-3">
                  {r.guest_name ?? t("resChange.aGuest")} · {t("resChange.ref")} {r.reservation_ref}
                </p>
                <p className="mt-1 text-[12.5px] text-ink-2">
                  {t("resChange.current")} {fmtRange(r.current_range)}
                  {r.kind === "dates" && r.new_range && (
                    <>
                      {" "}
                      → <span className="font-medium text-ink">{fmtRange(r.new_range)}</span>
                    </>
                  )}
                </p>
                {r.reason && (
                  <p className="mt-1.5 rounded-[8px] bg-bone-2 px-2.5 py-1.5 text-[12.5px] text-ink-2">
                    {r.reason}
                  </p>
                )}
              </div>
              <span className="shrink-0 text-[11.5px] text-ink-3">{formatDate(r.created_at)}</span>
            </div>

            {noteFor === r.id ? (
              <div className="mt-3">
                <textarea
                  className="field h-auto resize-y py-2 text-[13px]"
                  rows={2}
                  placeholder={t("resChange.staffNotePlaceholder")}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => resolve(r.id, true)}
                    disabled={busy === r.id}
                    className="press inline-flex h-9 items-center gap-1.5 rounded-full bg-forest px-4 text-[12.5px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
                  >
                    {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    {t("resChange.approve")}
                  </button>
                  <button
                    onClick={() => resolve(r.id, false)}
                    disabled={busy === r.id}
                    className="press inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-[12.5px] font-medium text-danger hover:border-danger/40 disabled:opacity-50"
                  >
                    <XCircle className="h-3.5 w-3.5" /> {t("resChange.decline")}
                  </button>
                  <button
                    onClick={() => {
                      setNoteFor(null);
                      setNote("");
                    }}
                    className="press inline-flex h-9 items-center rounded-full px-3 text-[12.5px] text-ink-3 hover:text-ink"
                  >
                    {t("resChange.back")}
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => {
                  setNoteFor(r.id);
                  setNote("");
                }}
                className="press mt-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[12.5px] font-medium text-bone hover:bg-forest-2"
              >
                {t("resChange.decide")}
              </button>
            )}
          </li>
        ))}
      </ul>
      {err && <p className="mt-2 text-[12.5px] text-danger">{err}</p>}
    </div>
  );
}
