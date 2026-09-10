import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageTitle, StatusBadge, EmptyState } from "@/components/app/ui";
import { getT } from "@/lib/i18n";
import { ReservationActions } from "@/components/console/reservation-actions";
import { ChangeRequestsBoard, type PendingChange } from "@/components/console/change-requests-board";
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
      <PageTitle title={t("console.title.reservations")} sub={t("console.sub.reservations")} />
      <ChangeRequestsBoard rows={pendingChanges} />
      {!rows || rows.length === 0 ? (
        <EmptyState title={t("console.empty.reservationsT")} body={t("console.empty.reservationsB")} />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const { start, end } = parseRange(r.date_range as string);
            const g = r.guest as { full_name?: string; phone?: string } | null;
            return (
              <li key={r.id} className="rounded-[var(--radius-lg)] border border-line bg-bone p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[14.5px] font-medium text-ink">
                      {formatDate(start, { day: "numeric", month: "short" })} —{" "}
                      {formatDate(end, { day: "numeric", month: "short", year: "numeric" })}
                    </p>
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
                  <StatusBadge status={r.status as string} />
                </div>
                <div className="mt-4 border-t border-line pt-3">
                  <ReservationActions id={r.id as string} status={r.status as string} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
