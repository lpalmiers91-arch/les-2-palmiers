import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Card, StatusBadge } from "@/components/app/ui";
import { getT } from "@/lib/i18n";
import { formatDate, formatXOF, parseRange } from "@/lib/format";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function StaffHome() {
  const { t } = await getT();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: reservations }, { data: pending }, { data: queue }] = await Promise.all([
    supabase
      .from("reservations")
      .select(
        "reference, date_range, status, guests_count, guest:profiles!reservations_guest_id_fkey(full_name)",
      )
      .in("status", ["confirmed", "in_stay"])
      .order("date_range"),
    supabase
      .from("service_orders")
      .select("id", { count: "exact", head: true })
      .in("status", ["requested", "accepted"]),
    supabase
      .from("service_orders")
      .select(
        "id, reference, status, scheduled_for, service:services(title), customer:profiles!service_orders_customer_id_fkey(full_name)",
      )
      .in("status", ["requested", "accepted", "scheduled"])
      .order("created_at")
      .limit(8),
  ]);

  const arrivals = (reservations ?? []).filter((r) => parseRange(r.date_range as string).start === today);
  const departures = (reservations ?? []).filter((r) => parseRange(r.date_range as string).end === today);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="display text-[1.7rem] text-ink sm:text-[2rem]">{t("console.staffHome.today")}</h1>
      <p className="mt-1 text-[14px] text-ink-3">
        {formatDate(today, { weekday: "long", day: "numeric", month: "long" })}
      </p>

      <div className="mt-7 grid gap-4 sm:grid-cols-3">
        <Stat label={t("console.staffHome.arrivals")} value={arrivals.length} href="/staff/reservations" />
        <Stat label={t("console.staffHome.departures")} value={departures.length} href="/staff/reservations" />
        <Stat label={t("console.staffHome.pendingRequests")} value={pending?.length ?? 0} href="/staff/demandes" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
            {t("console.staffHome.movementsTitle")}
          </h2>
          {arrivals.length + departures.length === 0 ? (
            <Card><p className="text-[13.5px] text-ink-3">{t("console.staffHome.noMovements")}</p></Card>
          ) : (
            <ul className="space-y-2">
              {arrivals.map((r) => (
                <Movement key={"a" + r.reference} r={r} kind={t("console.staffHome.arrival")}
                  clientLabel={t("console.staffHome.client")} persons={t("console.staffHome.persons")} refLabel={t("console.staffHome.ref")} />
              ))}
              {departures.map((r) => (
                <Movement key={"d" + r.reference} r={r} kind={t("console.staffHome.departure")}
                  clientLabel={t("console.staffHome.client")} persons={t("console.staffHome.persons")} refLabel={t("console.staffHome.ref")} />
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
            {t("console.staffHome.queueTitle")}
          </h2>
          {!queue || queue.length === 0 ? (
            <Card><p className="text-[13.5px] text-ink-3">{t("console.staffHome.queueEmpty")}</p></Card>
          ) : (
            <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-bone">
              {queue.map((o) => (
                <li key={o.id}>
                  <Link href="/staff/demandes" className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-ink/[0.025]">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] text-ink">
                        {(o.service as { title?: string } | null)?.title} —{" "}
                        {(o.customer as { full_name?: string } | null)?.full_name ?? t("console.staffHome.client")}
                      </p>
                      <p className="text-[11.5px] text-ink-3">
                        {o.scheduled_for ? formatDate(o.scheduled_for) : t("console.staffHome.slotTbd")}
                      </p>
                    </div>
                    <StatusBadge status={o.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href} className="press rounded-[var(--radius-lg)] border border-line bg-bone p-5 transition-colors hover:border-ink/25">
      <p className="tnum display text-[2rem] text-ink">{value}</p>
      <p className="mt-0.5 text-[13px] text-ink-3">{label}</p>
    </Link>
  );
}

function Movement({
  r,
  kind,
  clientLabel,
  persons,
  refLabel,
}: {
  r: Record<string, unknown>;
  kind: string;
  clientLabel: string;
  persons: string;
  refLabel: string;
}) {
  return (
    <li className="flex items-center justify-between rounded-[12px] border border-line bg-bone px-4 py-3">
      <div>
        <p className="text-[13.5px] text-ink">
          {(r.guest as { full_name?: string } | null)?.full_name ?? clientLabel} ·{" "}
          {String(r.guests_count)} {persons}
        </p>
        <p className="text-[11.5px] text-ink-3">
          {refLabel} {String(r.reference)}
        </p>
      </div>
      <span className="text-[12px] font-medium text-forest-2">{kind}</span>
    </li>
  );
}
