import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Card, StatusBadge } from "@/components/app/ui";
import { formatXOF, formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function AdminHome() {
  const supabase = await createClient();

  const [{ data: revenue }, { data: occ }, { data: perf }, { data: queue }, { data: pays }] =
    await Promise.all([
      supabase.from("v_revenue_daily").select("*"),
      supabase.from("v_occupancy_monthly").select("*").order("month"),
      supabase.from("v_service_performance").select("*"),
      supabase.from("v_pending_queue").select("*"),
      supabase.from("payments").select("amount, status, purpose, paid_at").eq("status", "paid"),
    ]);

  const totalRevenue = (pays ?? []).reduce((s, p) => s + Number(p.amount), 0);
  const lodgingRevenue = (pays ?? [])
    .filter((p) => p.purpose === "reservation")
    .reduce((s, p) => s + Number(p.amount), 0);
  const serviceRevenue = totalRevenue - lodgingRevenue;

  // occupation sur les 12 mois glissants
  const nights = (occ ?? []).reduce((s, r) => s + Number(r.nights_sold ?? 0), 0);
  const occupancy = Math.min(100, Math.round((nights / 365) * 100));

  const monthly = buildMonthly(revenue ?? []);
  const maxM = Math.max(1, ...monthly.map((m) => m.value));

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="display text-[1.7rem] text-ink sm:text-[2rem]">Tableau de bord</h1>
      <p className="mt-1 text-[14px] text-ink-3">Vue d'ensemble de l'activité.</p>

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPI label="Revenu total" value={formatXOF(totalRevenue)} />
        <KPI label="Hébergement" value={formatXOF(lodgingRevenue)} />
        <KPI label="Services" value={formatXOF(serviceRevenue)} />
        <KPI label="Occupation (12 mois)" value={`${occupancy} %`} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
            Revenu par mois
          </h2>
          {monthly.every((m) => m.value === 0) ? (
            <p className="mt-4 text-[13.5px] text-ink-3">Pas encore de paiement enregistré.</p>
          ) : (
            <div className="mt-5 flex items-end gap-1.5" style={{ height: 140 }}>
              {monthly.map((m) => (
                <div key={m.key} className="flex flex-1 flex-col items-center gap-1.5">
                  <div
                    className="w-full rounded-t-[3px] bg-forest-2"
                    style={{ height: `${(m.value / maxM) * 110 + (m.value ? 3 : 0)}px` }}
                    title={`${m.label} · ${formatXOF(m.value)}`}
                  />
                  <span className="text-[10px] text-ink-3">{m.label}</span>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
            Performance des services
          </h2>
          <ul className="mt-4 space-y-2.5 text-[13px]">
            {(perf ?? [])
              .filter((p) => Number(p.orders) > 0)
              .slice(0, 6)
              .map((p) => (
                <li key={p.slug} className="flex justify-between">
                  <span className="text-ink">{p.title}</span>
                  <span className="tnum text-ink-3">
                    {p.completed}/{p.orders} · {formatXOF(Number(p.revenue))}
                  </span>
                </li>
              ))}
            {(perf ?? []).every((p) => Number(p.orders) === 0) && (
              <li className="text-ink-3">Aucune commande de service.</li>
            )}
          </ul>
        </Card>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
          À traiter
        </h2>
        {!queue || queue.length === 0 ? (
          <Card><p className="text-[13.5px] text-ink-3">Rien en attente.</p></Card>
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-bone">
            {queue.map((q) => (
              <li key={q.id} className="flex items-center justify-between px-5 py-3 text-[13.5px]">
                <span className="text-ink">
                  {q.kind === "reservation" ? "Réservation" : "Demande de service"} · {q.reference}
                </span>
                <span className="flex items-center gap-3">
                  <StatusBadge status={q.status ?? "pending"} />
                  {q.created_at && (
                    <span className="text-[11.5px] text-ink-3">
                      {formatDate(q.created_at, { day: "numeric", month: "short" })}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-5">
      <p className="text-[12px] text-ink-3">{label}</p>
      <p className="tnum display mt-1.5 text-[1.4rem] text-ink">{value}</p>
    </div>
  );
}

function buildMonthly(rows: { day: string | null; gross_revenue: number | null }[]) {
  const now = new Date();
  const months: { key: string; label: string; value: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString("fr-FR", { month: "short" }),
      value: 0,
    });
  }
  for (const r of rows) {
    if (!r.day) continue;
    const d = new Date(r.day);
    const k = `${d.getFullYear()}-${d.getMonth()}`;
    const m = months.find((x) => x.key === k);
    if (m) m.value += Number(r.gross_revenue ?? 0);
  }
  return months;
}
