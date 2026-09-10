"use client";

import { useState } from "react";
import { Mail, Phone, Check, Archive, Trash2, RotateCcw, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n/provider";

export type ContactRow = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  subject: string | null;
  message: string;
  locale: string | null;
  status: "new" | "handled" | "archived";
  created_at: string;
};

export function ContactInbox({ rows: initial }: { rows: ContactRow[] }) {
  const { t } = useT();
  const [rows, setRows] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "new" | "handled" | "archived">("new");

  async function setStatus(id: string, status: ContactRow["status"]) {
    setBusy(id);
    const { error } = await createClient().rpc("set_contact_status", { p_id: id, p_status: status });
    setBusy(null);
    if (!error) setRows((r) => r.map((x) => (x.id === id ? { ...x, status } : x)));
  }

  async function remove(id: string) {
    if (!confirm(t("contactInbox.deleteConfirm"))) return;
    setBusy(id);
    const { error } = await createClient().rpc("delete_contact_message", { p_id: id });
    setBusy(null);
    if (!error) setRows((r) => r.filter((x) => x.id !== id));
  }

  const shown = rows.filter((r) => filter === "all" || r.status === filter);
  const counts = {
    new: rows.filter((r) => r.status === "new").length,
    handled: rows.filter((r) => r.status === "handled").length,
    archived: rows.filter((r) => r.status === "archived").length,
  };

  return (
    <>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {(["new", "handled", "archived", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`press rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
              filter === f ? "bg-ink text-bone" : "border border-line text-ink-2 hover:border-ink/25"
            }`}
          >
            {t(`contactInbox.filter.${f}`)}
            {f !== "all" && counts[f] > 0 && <span className="ml-1.5 tnum opacity-70">{counts[f]}</span>}
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="rounded-[var(--radius-lg)] border border-line bg-bone p-8 text-center text-[13.5px] text-ink-3">
          {t("contactInbox.empty")}
        </p>
      ) : (
        <ul className="space-y-3">
          {shown.map((r) => (
            <li key={r.id} className="rounded-[var(--radius-lg)] border border-line bg-bone p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[14.5px] font-medium text-ink">
                    {r.name}
                    {r.subject ? <span className="font-normal text-ink-3"> · {r.subject}</span> : null}
                  </p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] text-ink-3">
                    <a href={`mailto:${r.email}`} className="inline-flex items-center gap-1 hover:text-ink">
                      <Mail className="h-3.5 w-3.5" /> {r.email}
                    </a>
                    {r.phone && (
                      <a href={`tel:${r.phone}`} className="inline-flex items-center gap-1 hover:text-ink">
                        <Phone className="h-3.5 w-3.5" /> {r.phone}
                      </a>
                    )}
                    <span>{formatDate(r.created_at)}</span>
                    {r.locale && <span className="uppercase">{r.locale}</span>}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    r.status === "new"
                      ? "bg-forest/10 text-forest-2"
                      : r.status === "handled"
                        ? "bg-ink/10 text-ink-2"
                        : "bg-bone-2 text-ink-3"
                  }`}
                >
                  {t(`contactInbox.status.${r.status}`)}
                </span>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink-2">{r.message}</p>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-line-soft pt-3">
                <a
                  href={`mailto:${r.email}?subject=${encodeURIComponent(
                    "Re: " + (r.subject || t("contactInbox.reSubject")),
                  )}`}
                  className="press inline-flex h-8 items-center gap-1.5 rounded-full bg-ink px-3.5 text-[12.5px] font-medium text-bone hover:bg-forest-2"
                >
                  <Mail className="h-3.5 w-3.5" /> {t("contactInbox.reply")}
                </a>
                {r.status !== "handled" && (
                  <button
                    onClick={() => setStatus(r.id, "handled")}
                    disabled={busy === r.id}
                    className="press inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3.5 text-[12.5px] font-medium text-ink-2 hover:border-ink/25 disabled:opacity-50"
                  >
                    {busy === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                    {t("contactInbox.markHandled")}
                  </button>
                )}
                {r.status !== "new" && (
                  <button
                    onClick={() => setStatus(r.id, "new")}
                    disabled={busy === r.id}
                    className="press inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3.5 text-[12.5px] font-medium text-ink-2 hover:border-ink/25 disabled:opacity-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" /> {t("contactInbox.reopen")}
                  </button>
                )}
                {r.status !== "archived" && (
                  <button
                    onClick={() => setStatus(r.id, "archived")}
                    disabled={busy === r.id}
                    className="press inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3.5 text-[12.5px] font-medium text-ink-2 hover:border-ink/25 disabled:opacity-50"
                  >
                    <Archive className="h-3.5 w-3.5" /> {t("contactInbox.archive")}
                  </button>
                )}
                <button
                  onClick={() => remove(r.id)}
                  disabled={busy === r.id}
                  className="press inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3.5 text-[12.5px] font-medium text-danger hover:border-danger/40 disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" /> {t("contactInbox.delete")}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
