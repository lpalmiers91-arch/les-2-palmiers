import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageTitle, Card } from "@/components/app/ui";
import { getT } from "@/lib/i18n";
import { ExportButtons } from "@/components/console/export-buttons";

export const metadata: Metadata = { title: "Analytics" };

function host(url: string | null): string {
  if (!url) return "Direct";
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Direct";
  }
}

export default async function StaffAnalyticsPage() {
  const { t } = await getT();
  const supabase = await createClient();

  const since = new Date(Date.now() - 30 * 864e5).toISOString();

  const [{ data: daily }, { data: events }] = await Promise.all([
    supabase.from("v_analytics_daily").select("*"),
    supabase
      .from("analytics_events")
      .select("event, path, referrer, utm_source, session_id, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(5000),
  ]);

  const rows = events ?? [];
  const views = rows.filter((r) => r.event === "page_view");
  const sessions = new Set(rows.map((r) => r.session_id)).size;
  const ctaClicks = rows.filter((r) => r.event === "cta_click").length;
  const bookings = rows.filter((r) => r.event === "booking").length;

  const byPath = tally(views.map((r) => r.path || "/"));
  const bySource = tally(
    rows.map((r) => r.utm_source || host(r.referrer)),
  );

  // tunnel simple : visite /reserver -> clic CTA "reserver" -> réservation
  const reserverViews = new Set(
    views.filter((r) => (r.path || "").startsWith("/reserver")).map((r) => r.session_id),
  );
  const reserverClicks = new Set(
    rows
      .filter((r) => r.event === "cta_click" && /reserv|book/i.test(r.path || ""))
      .map((r) => r.session_id),
  );
  const funnel = [
    { label: t("console.analytics.fVisitors"), n: sessions },
    { label: t("console.analytics.fOpenReserve"), n: reserverViews.size },
    { label: t("console.analytics.fClickBook"), n: reserverClicks.size },
    { label: t("console.analytics.fBookings"), n: bookings },
  ];

  const maxDay = Math.max(1, ...(daily ?? []).map((d) => Number(d.sessions ?? 0)));

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle
        title={t("console.analytics.title")}
        sub={t("console.analytics.sub")}
        action={<ExportButtons />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI label={t("console.analytics.views")} value={views.length} />
        <KPI label={t("console.analytics.sessions")} value={sessions} />
        <KPI label={t("console.analytics.ctaClicks")} value={ctaClicks} />
        <KPI
          label={t("console.analytics.conversion")}
          value={sessions ? `${Math.round((bookings / sessions) * 100)} %` : "—"}
        />
      </div>

      <Card className="mt-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
          {t("console.analytics.perDay")}
        </h2>
        {(daily ?? []).length === 0 ? (
          <p className="mt-4 text-[13.5px] text-ink-3">{t("console.analytics.empty")}</p>
        ) : (
          <div className="mt-5 flex items-end gap-1" style={{ height: 130 }}>
            {(daily ?? []).map((d) => (
              <div key={String(d.day)} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-[3px] bg-forest-2"
                  style={{ height: `${(Number(d.sessions ?? 0) / maxDay) * 105 + 2}px` }}
                  title={`${d.day} · ${d.sessions} sessions · ${d.views} vues`}
                />
                <span className="text-[9px] text-ink-3">{String(d.day).slice(8)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
            {t("console.analytics.topPages")}
          </h2>
          <ul className="mt-3 space-y-2 text-[13px]">
            {byPath.slice(0, 8).map(([path, n]) => (
              <li key={path} className="flex justify-between gap-3">
                <span className="truncate text-ink">{path}</span>
                <span className="tnum shrink-0 text-ink-3">{n}</span>
              </li>
            ))}
            {byPath.length === 0 && <li className="text-ink-3">{t("console.analytics.empty")}</li>}
          </ul>
        </Card>
        <Card>
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
            {t("console.analytics.sources")}
          </h2>
          <ul className="mt-3 space-y-2 text-[13px]">
            {bySource.slice(0, 8).map(([src, n]) => (
              <li key={src} className="flex justify-between gap-3">
                <span className="truncate text-ink">{src}</span>
                <span className="tnum shrink-0 text-ink-3">{n}</span>
              </li>
            ))}
            {bySource.length === 0 && <li className="text-ink-3">{t("console.analytics.empty")}</li>}
          </ul>
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
          {t("console.analytics.funnel")}
        </h2>
        <ul className="mt-4 space-y-2.5">
          {funnel.map((step, i) => {
            const pct = funnel[0].n ? Math.round((step.n / funnel[0].n) * 100) : 0;
            return (
              <li key={step.label}>
                <div className="flex justify-between text-[13px]">
                  <span className="text-ink">{step.label}</span>
                  <span className="tnum text-ink-3">
                    {step.n} {i > 0 && `· ${pct}%`}
                  </span>
                </div>
                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-bone-2">
                  <div className="h-full rounded-full bg-forest-2" style={{ width: `${pct}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}

function tally(list: string[]): [string, number][] {
  const m = new Map<string, number>();
  for (const x of list) m.set(x, (m.get(x) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

function KPI({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-5">
      <p className="text-[12px] text-ink-3">{label}</p>
      <p className="tnum display mt-1.5 text-[1.4rem] text-ink">{value}</p>
    </div>
  );
}
