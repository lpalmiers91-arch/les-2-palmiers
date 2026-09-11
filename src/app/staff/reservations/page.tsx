import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageTitle, StatusBadge, EmptyState } from "@/components/app/ui";
import { getT } from "@/lib/i18n";
import { ReservationActions } from "@/components/console/reservation-actions";
import { ChangeRequestsBoard, type PendingChange } from "@/components/console/change-requests-board";
import { ManualBooking } from "@/components/console/manual-booking";
import { formatDate, formatXOF, parseRange } from "@/lib/format";

export const metadata: Metadata = { title: "Réservations" };

export default async function StaffReservations() {
  const { t } = await getT();
  const supabase = await createClient();
  const [{ data: rows }, { data: changeRows }] = await Promise.all([
    supabase
      .from("reservations")
      .select(
        "id, reference, date_range, status, total_amount, amount_paid, guests_count, guest:profiles!reservations_guest_id_fkey(full_name, phone)",
      )
      .order("date_range", { ascending: false }),
    supabase
      .from("reservation_change_requests")
      .select(
        "id, kind, reason, new_range, created_at, reservation:reservations!reservation_change_requests_reservation_id_fkey(reference, date_range, guest:profiles!reservations_guest_id_fkey(full_name))",
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  const { data: apts } = await supabase
    .from("apartments")
    .select("id, name")
    .in("status", ["published", "draft"])
    .order("created_at");

  const { data: pendingCharges } = await supabase
    .from("reservation_charges")
    .select("reservation_id")
    .eq("status", "pending");
  const chargeCount = new Map<string, number>();
  for (const c of pendingCharges ?? []) {
    const k = c.reservation_id as string;
    chargeCount.set(k, (chargeCount.get(k) ?? 0) + 1);
  }

  const pendingChanges: PendingChange[] = (changeRows ?? []).map((c) => {
    const res = c.reservation as {
      reference?: string;
      date_range?: string;
      guest?: { full_name?: string } | null;
    } | null;
    return {
      id: c.id as string,
      kind: c.kind as "cancel" | "dates",
      reason: c.reason as string | null,
      new_range: c.new_range as string | null,
      created_at: c.created_at as string,
      reservation_ref: res?.reference ?? "",
      guest_name: res?.guest?.full_name ?? null,
      current_range: res?.date_range ?? "",
    };
  });

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle
        title={t("console.title.reservations")}
        sub={t("console.sub.reservations")}
        action={<ManualBooking apartments={apts ?? []} />}
      />
      <ChangeRequestsBoard rows={pendingChanges} />
      {!rows || rows.length === 0 ? (
        <EmptyState title={t("console.empty.reservationsT")} body={t("console.empty.reservationsB")} />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const { start, end } = parseRange(r.date_range as string);
            const g = r.guest as { full_name?: string; phone?: string } | null;
            const href = `/staff/reservations/${encodeURIComponent(r.reference as string)}`;
            const nCharges = chargeCount.get(r.id as string) ?? 0;
            return (
              <li key={r.id} className="rounded-[var(--radius-lg)] border border-line bg-bone p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={href} className="text-[14.5px] font-medium text-ink hover:text-forest-2">
                      {formatDate(start, { day: "numeric", month: "short" })} —{" "}
                      {formatDate(end, { day: "numeric", month: "short", year: "numeric" })}
                    </Link>
                    <p className="mt-0.5 text-[12.5px] text-ink-3">
                      {g?.full_name ?? t("console.lists.client")} {g?.phone ? `· ${g.phone}` : ""} ·{" "}
                      {r.guests_count} {t("console.lists.guestsAbbr")} · {t("console.lists.ref")}{" "}
                      {r.reference}
                    </p>
                    <p className="mt-1 text-[12.5px] tnum text-ink-3">
                      {formatXOF(r.amount_paid as number)} / {formatXOF(r.total_amount as number)}{" "}
                      {t("console.lists.paidOf")}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <StatusBadge status={r.status as string} />
                    {nCharges > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warn/14 px-2 py-0.5 text-[10.5px] font-medium text-warn">
                        <Wallet className="h-3 w-3" />
                        {t("console.resvList.pendingCharges", { n: nCharges })}
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
                  <ReservationActions
                    id={r.id as string}
                    status={r.status as string}
                    start={start}
                    end={end}
                  />
                  <Link
                    href={href}
                    className="press ml-auto inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[12.5px] font-medium text-bone hover:bg-forest-2"
                  >
                    {t("console.resvList.openFile")}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
