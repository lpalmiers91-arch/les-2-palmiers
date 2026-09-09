import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageTitle, StatusBadge, EmptyState } from "@/components/app/ui";
import { formatXOF, formatDate, parseRange } from "@/lib/format";

export const metadata: Metadata = { title: "Réservations" };

export default async function ReservationsPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("reservations")
    .select("id, reference, date_range, status, total_amount, guests_count, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle
        title="Vos réservations"
        sub="Séjours à venir, en cours et passés."
        action={
          <Link
            href="/reserver"
            className="press inline-flex h-10 items-center rounded-full bg-ink px-5 text-[13px] font-medium text-bone hover:bg-forest-2"
          >
            Nouveau séjour
          </Link>
        }
      />

      {!rows || rows.length === 0 ? (
        <EmptyState
          title="Pas encore de réservation"
          body="Réservez l'appartement et retrouvez ici tous les détails de votre séjour."
          cta={{ href: "/reserver", label: "Réserver un séjour" }}
        />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-bone">
          {rows.map((r) => {
            const { start, end } = parseRange(r.date_range as string);
            return (
              <li key={r.id}>
                <Link
                  href={`/app/reservations/${r.reference}`}
                  className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-ink/[0.025]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-[14.5px] font-medium text-ink">
                        {formatDate(start, { day: "numeric", month: "short" })} —{" "}
                        {formatDate(end, { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                      <StatusBadge status={r.status as string} />
                    </div>
                    <p className="mt-0.5 text-[12.5px] text-ink-3">
                      Réf. {r.reference} · {r.guests_count} voyageur
                      {(r.guests_count as number) > 1 ? "s" : ""} ·{" "}
                      <span className="tnum">{formatXOF(r.total_amount as number)}</span>
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
