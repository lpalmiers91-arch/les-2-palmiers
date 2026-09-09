import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageTitle, Card } from "@/components/app/ui";
import { getT } from "@/lib/i18n";
import { formatXOF } from "@/lib/format";

export const metadata: Metadata = { title: "Statistiques" };

export default async function StatistiquesPage() {
  const { t } = await getT();
  const supabase = await createClient();
  const [{ data: perf }, { data: staff }, { data: occ }] = await Promise.all([
    supabase.from("v_service_performance").select("*"),
    supabase.from("v_staff_activity").select("*"),
    supabase.from("v_occupancy_monthly").select("*").order("month"),
  ]);

  const activityByRole = new Map<string, number>();
  for (const s of staff ?? []) {
    activityByRole.set(s.actor_role ?? "?", (activityByRole.get(s.actor_role ?? "?") ?? 0) + Number(s.actions));
  }

  const maxOcc = Math.max(1, ...(occ ?? []).map((o) => Number(o.nights_sold ?? 0)));

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle title={t("console.title.statistiques")} sub={t("console.sub.statistiques")} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
            {t("console.stats.nightsByMonth")}
          </h2>
          <div className="mt-5 flex items-end gap-1" style={{ height: 120 }}>
            {(occ ?? []).map((o) => (
              <div key={o.month} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-[3px] bg-forest-2"
                  style={{ height: `${(Number(o.nights_sold ?? 0) / maxOcc) * 95 + 2}px` }}
                  title={`${o.month} · ${o.nights_sold} nuits`}
                />
                <span className="text-[9px] text-ink-3">{String(o.month).slice(5)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
            {t("console.stats.teamActivity")}
          </h2>
          <ul className="mt-4 space-y-2 text-[13.5px]">
            {[...activityByRole.entries()].map(([role, n]) => (
              <li key={role} className="flex justify-between">
                <span className="capitalize text-ink">{role}</span>
                <span className="tnum text-ink-3">
                  {n} {t("console.stats.actions")}
                </span>
              </li>
            ))}
            {activityByRole.size === 0 && (
              <li className="text-ink-3">{t("console.stats.noTrackedActions")}</li>
            )}
          </ul>
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
          {t("console.adminHome.servicePerformance")}
        </h2>
        <table className="mt-3 w-full text-[13px]">
          <thead>
            <tr className="text-left text-[11.5px] uppercase tracking-[0.1em] text-ink-3">
              <th className="pb-2 font-medium">{t("console.stats.service")}</th>
              <th className="pb-2 text-right font-medium">{t("console.stats.requests")}</th>
              <th className="pb-2 text-right font-medium">{t("console.stats.completed")}</th>
              <th className="pb-2 text-right font-medium">{t("console.stats.declined")}</th>
              <th className="pb-2 text-right font-medium">{t("console.stats.revenue")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {(perf ?? []).map((p) => (
              <tr key={p.slug}>
                <td className="py-2 text-ink">{p.title}</td>
                <td className="py-2 text-right tnum text-ink-2">{p.orders}</td>
                <td className="py-2 text-right tnum text-ink-2">{p.completed}</td>
                <td className="py-2 text-right tnum text-ink-2">{p.declined}</td>
                <td className="py-2 text-right tnum text-ink">{formatXOF(Number(p.revenue))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
