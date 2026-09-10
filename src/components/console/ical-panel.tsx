"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, Plus, Trash2, RefreshCw, Loader2, CalendarSync } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { FUNCTIONS_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";
import { site } from "@/lib/site";
import { formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n/provider";

export type IcalFeed = {
  id: string;
  url: string;
  label: string | null;
  active: boolean;
  last_synced_at: string | null;
  last_status: string | null;
  last_count: number | null;
};

export function IcalPanel({
  apartmentId,
  icalToken,
  feeds: initial,
}: {
  apartmentId: string;
  icalToken: string;
  feeds: IcalFeed[];
}) {
  const { t } = useT();
  const router = useRouter();
  const [feeds, setFeeds] = useState(initial);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const exportUrl = `${site.url}/api/ical/${icalToken}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(exportUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard indisponible */
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!/^https?:\/\//.test(url.trim())) {
      setErr(t("ical.errUrl"));
      return;
    }
    setBusy("add");
    const { data, error } = await createClient()
      .from("apartment_ical_feeds")
      .insert({ apartment_id: apartmentId, url: url.trim(), label: label.trim() || null })
      .select("id, url, label, active, last_synced_at, last_status, last_count")
      .single();
    setBusy(null);
    if (error) {
      setErr(/duplicate|unique/.test(error.message) ? t("ical.errDup") : t("ical.errGeneric"));
      return;
    }
    setFeeds((f) => [...f, data as IcalFeed]);
    setUrl("");
    setLabel("");
    void sync(data!.id);
  }

  async function remove(id: string) {
    setBusy(id);
    await createClient().from("apartment_ical_feeds").delete().eq("id", id);
    setBusy(null);
    setFeeds((f) => f.filter((x) => x.id !== id));
    router.refresh();
  }

  async function sync(id: string) {
    setBusy(id);
    try {
      const {
        data: { session },
      } = await createClient().auth.getSession();
      await fetch(`${FUNCTIONS_URL}/ical-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ feed_id: id }),
      });
    } catch {
      /* ignore */
    }
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="mt-8 rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6">
      <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
        <CalendarSync className="h-4 w-4" /> {t("ical.title")}
      </h2>
      <p className="mt-1.5 text-[13px] text-ink-3">{t("ical.lede")}</p>

      {/* export */}
      <div className="mt-4">
        <p className="text-[12.5px] font-medium text-ink-2">{t("ical.exportLabel")}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-[8px] bg-bone-2 px-3 py-2 text-[12px] text-ink-2">
            {exportUrl}
          </code>
          <button
            onClick={copy}
            className="press inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line px-3 text-[12.5px] font-medium text-ink-2 hover:border-ink/25"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-2" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? t("ical.copied") : t("ical.copy")}
          </button>
        </div>
        <p className="mt-1 text-[11.5px] text-ink-3">{t("ical.exportHint")}</p>
      </div>

      {/* import */}
      <div className="mt-6 border-t border-line-soft pt-5">
        <p className="text-[12.5px] font-medium text-ink-2">{t("ical.importLabel")}</p>

        {feeds.length > 0 && (
          <ul className="mt-3 space-y-2">
            {feeds.map((f) => (
              <li key={f.id} className="rounded-[10px] border border-line px-3 py-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-ink">{f.label || f.url}</p>
                    <p className="truncate text-[11.5px] text-ink-3">{f.url}</p>
                    <p className="mt-0.5 text-[11.5px] text-ink-3">
                      {f.last_synced_at
                        ? f.last_status?.startsWith("error")
                          ? `${t("ical.lastError")} · ${formatDate(f.last_synced_at)}`
                          : t("ical.lastSync", { count: f.last_count ?? 0, date: formatDate(f.last_synced_at) })
                        : t("ical.neverSynced")}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => sync(f.id)}
                      disabled={busy === f.id}
                      className="press rounded-full p-1.5 text-ink-3 hover:bg-ink/5 hover:text-ink disabled:opacity-50"
                      aria-label={t("ical.syncNow")}
                    >
                      {busy === f.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => remove(f.id)}
                      disabled={busy === f.id}
                      className="press rounded-full p-1.5 text-danger hover:bg-danger/10 disabled:opacity-50"
                      aria-label={t("ical.remove")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={add} className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
          <div className="grid gap-2">
            <input
              className="field"
              placeholder={t("ical.urlPlaceholder")}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <input
              className="field"
              placeholder={t("ical.labelPlaceholder")}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={busy === "add"}
            className="press inline-flex h-11 items-center gap-1.5 self-start rounded-full bg-ink px-4 text-[13px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
          >
            {busy === "add" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {t("ical.add")}
          </button>
        </form>
        {err && <p className="mt-2 text-[12.5px] text-danger">{err}</p>}
      </div>
    </div>
  );
}
