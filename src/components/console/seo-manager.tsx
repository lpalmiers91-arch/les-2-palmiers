"use client";

import { useState } from "react";
import { Loader2, Check, ExternalLink, Search, AlertTriangle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { site } from "@/lib/site";
import { useT } from "@/lib/i18n/provider";

export type SeoRoute = { path: string; label: string; kind: "static" | "apartment" | "page" };
export type SeoMetaRow = { path: string; title: string | null; description: string | null; no_index: boolean };
export type SeoSettings = {
  keywords?: string[];
  default_description?: string;
  priceRange?: string;
  twitter?: string;
  google_verification?: string;
};
export type SeoCheck = { key: string; ok: boolean; detail?: string };

export function SeoManager({
  routes,
  metas: initialMetas,
  settings: initialSettings,
  checks,
}: {
  routes: SeoRoute[];
  metas: SeoMetaRow[];
  settings: SeoSettings;
  checks: SeoCheck[];
}) {
  const { t } = useT();
  const [tab, setTab] = useState<"settings" | "pages" | "diag">("pages");

  // settings
  const [s, setS] = useState<SeoSettings>(initialSettings);
  const [kw, setKw] = useState((initialSettings.keywords ?? []).join(", "));
  const [sBusy, setSBusy] = useState(false);
  const [sDone, setSDone] = useState(false);

  // pages
  const metaMap = new Map(initialMetas.map((m) => [m.path, m]));
  const [edits, setEdits] = useState<Record<string, { title: string; description: string; no_index: boolean }>>(
    Object.fromEntries(
      routes.map((r) => {
        const m = metaMap.get(r.path);
        return [r.path, { title: m?.title ?? "", description: m?.description ?? "", no_index: m?.no_index ?? false }];
      }),
    ),
  );
  const [savingPath, setSavingPath] = useState<string | null>(null);
  const [savedPath, setSavedPath] = useState<string | null>(null);

  async function saveSettings() {
    setSBusy(true);
    const seo: SeoSettings = {
      ...s,
      keywords: kw.split(",").map((x) => x.trim()).filter(Boolean),
    };
    await createClient().rpc("set_seo_settings", { p_seo: seo as never });
    setS(seo);
    setSBusy(false);
    setSDone(true);
    setTimeout(() => setSDone(false), 2000);
  }

  async function savePage(path: string) {
    const e = edits[path];
    setSavingPath(path);
    await createClient().rpc("set_seo_meta", {
      p_path: path,
      p_title: e.title,
      p_description: e.description,
      p_no_index: e.no_index,
    });
    setSavingPath(null);
    setSavedPath(path);
    setTimeout(() => setSavedPath((p) => (p === path ? null : p)), 2000);
  }

  return (
    <div>
      <div className="mb-5 flex gap-1.5">
        {(["pages", "settings", "diag"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`press rounded-full px-3.5 py-1.5 text-[12.5px] font-medium transition-colors ${
              tab === k ? "bg-ink text-bone" : "border border-line text-ink-2 hover:border-ink/25"
            }`}
          >
            {t(`seo.tab.${k}`)}
          </button>
        ))}
      </div>

      {tab === "pages" && (
        <div className="space-y-3">
          {routes.map((r) => {
            const e = edits[r.path];
            const tLen = e.title.length;
            const dLen = e.description.length;
            return (
              <div key={r.path} className="rounded-[var(--radius-lg)] border border-line bg-bone p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-medium text-ink">{r.label}</p>
                    <a
                      href={`${site.url}${r.path}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11.5px] text-ink-3 hover:text-ink"
                    >
                      {r.path} <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <label className="flex shrink-0 items-center gap-1.5 text-[12px] text-ink-2">
                    <input
                      type="checkbox"
                      checked={e.no_index}
                      onChange={(ev) =>
                        setEdits((p) => ({ ...p, [r.path]: { ...p[r.path], no_index: ev.target.checked } }))
                      }
                      className="h-3.5 w-3.5 accent-forest"
                    />
                    {t("seo.noIndex")}
                  </label>
                </div>

                <label className="mt-3 block">
                  <span className="flex items-center justify-between text-[12px] text-ink-2">
                    {t("seo.metaTitle")}
                    <span className={`tnum ${tLen > 60 ? "text-danger" : tLen >= 40 ? "text-forest-2" : "text-ink-3"}`}>
                      {tLen}/60
                    </span>
                  </span>
                  <input
                    className="field mt-1"
                    value={e.title}
                    placeholder={t("seo.titlePlaceholder", { label: r.label })}
                    onChange={(ev) =>
                      setEdits((p) => ({ ...p, [r.path]: { ...p[r.path], title: ev.target.value } }))
                    }
                  />
                </label>
                <label className="mt-2 block">
                  <span className="flex items-center justify-between text-[12px] text-ink-2">
                    {t("seo.metaDescription")}
                    <span className={`tnum ${dLen > 160 ? "text-danger" : dLen >= 110 ? "text-forest-2" : "text-ink-3"}`}>
                      {dLen}/160
                    </span>
                  </span>
                  <textarea
                    className="field mt-1 h-auto resize-y py-2"
                    rows={2}
                    value={e.description}
                    onChange={(ev) =>
                      setEdits((p) => ({ ...p, [r.path]: { ...p[r.path], description: ev.target.value } }))
                    }
                  />
                </label>

                {/* aperçu Google */}
                {(e.title || e.description) && (
                  <div className="mt-3 rounded-[8px] bg-bone-2 p-3">
                    <p className="text-[13px] text-[#1a0dab]">{e.title || r.label}</p>
                    <p className="text-[11px] text-[#006621]">{site.url}{r.path}</p>
                    <p className="text-[12px] leading-snug text-ink-2">{e.description}</p>
                  </div>
                )}

                <button
                  onClick={() => savePage(r.path)}
                  disabled={savingPath === r.path}
                  className="press mt-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[12.5px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
                >
                  {savingPath === r.path ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : savedPath === r.path ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : null}
                  {savedPath === r.path ? t("seo.saved") : t("seo.save")}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {tab === "settings" && (
        <div className="space-y-4 rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{t("seo.keywords")}</span>
            <input
              className="field"
              value={kw}
              onChange={(e) => setKw(e.target.value)}
              placeholder="appartement meublé Cotonou, conciergerie Bénin, location courte durée…"
            />
            <span className="mt-1 block text-[11.5px] text-ink-3">{t("seo.keywordsHint")}</span>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{t("seo.defaultDesc")}</span>
            <textarea
              className="field h-auto resize-y py-2"
              rows={2}
              value={s.default_description ?? ""}
              onChange={(e) => setS((p) => ({ ...p, default_description: e.target.value }))}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{t("seo.priceRange")}</span>
              <input
                className="field"
                value={s.priceRange ?? ""}
                placeholder="€€ / $$"
                onChange={(e) => setS((p) => ({ ...p, priceRange: e.target.value }))}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{t("seo.twitter")}</span>
              <input
                className="field"
                value={s.twitter ?? ""}
                placeholder="@les2palmiers"
                onChange={(e) => setS((p) => ({ ...p, twitter: e.target.value }))}
              />
            </label>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{t("seo.googleVerif")}</span>
            <input
              className="field"
              value={s.google_verification ?? ""}
              placeholder="google-site-verification=…"
              onChange={(e) => setS((p) => ({ ...p, google_verification: e.target.value }))}
            />
            <span className="mt-1 block text-[11.5px] text-ink-3">{t("seo.googleVerifHint")}</span>
          </label>
          <button
            onClick={saveSettings}
            disabled={sBusy}
            className="press inline-flex h-10 items-center gap-2 rounded-full bg-ink px-5 text-[13px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
          >
            {sBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : sDone ? <Check className="h-4 w-4" /> : null}
            {sDone ? t("seo.saved") : t("seo.save")}
          </button>
        </div>
      )}

      {tab === "diag" && (
        <div className="space-y-4">
          <ul className="divide-y divide-line-soft rounded-[var(--radius-lg)] border border-line bg-bone">
            {checks.map((c) => (
              <li key={c.key} className="flex items-start gap-3 px-4 py-3">
                {c.ok ? (
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-forest-2" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
                )}
                <div>
                  <p className="text-[13.5px] text-ink">{t(`seo.check.${c.key}`)}</p>
                  {c.detail && <p className="text-[12px] text-ink-3">{c.detail}</p>}
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2 text-[12.5px]">
            {[
              { href: `${site.url}/sitemap.xml`, label: "sitemap.xml" },
              { href: `${site.url}/robots.txt`, label: "robots.txt" },
              { href: `https://search.google.com/test/rich-results?url=${encodeURIComponent(site.url)}`, label: t("seo.richResults") },
              { href: `https://pagespeed.web.dev/analysis?url=${encodeURIComponent(site.url)}`, label: "PageSpeed" },
            ].map((l) => (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="press inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 font-medium text-ink-2 hover:border-ink/25"
              >
                <Search className="h-3.5 w-3.5" /> {l.label}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
