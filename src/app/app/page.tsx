import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CalendarDays, ConciergeBell, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, StatusBadge, EmptyState } from "@/components/app/ui";
import { formatXOF, formatDate, parseRange, nightsBetween } from "@/lib/format";

export const metadata: Metadata = { title: "Aperçu" };

export default async function AppHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user!.id)
    .maybeSingle();

  const { data: reservations } = await supabase
    .from("reservations")
    .select("id, reference, date_range, status, total_amount, amount_paid, guests_count")
    .in("status", ["pending_payment", "confirmed", "in_stay"])
    .order("created_at", { ascending: false });

  const next = reservations?.[0];
  const { data: orders } = await supabase
    .from("service_orders")
    .select("id, reference, status, scheduled_for, price, service:services(title)")
    .order("created_at", { ascending: false })
    .limit(3);

  const firstName = (profile?.full_name || "").split(" ")[0];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="display text-[1.7rem] text-ink sm:text-[2rem]">
        Bonjour{firstName ? ` ${firstName}` : ""}.
      </h1>
      <p className="mt-1 text-[14px] text-ink-3">
        Votre séjour et vos services, au même endroit.
      </p>

      <div className="mt-8">
        {next ? (
          <NextStay stay={next} />
        ) : (
          <EmptyState
            title="Aucune réservation à venir"
            body="Choisissez vos dates et réservez l'appartement en quelques minutes."
            cta={{ href: "/reserver", label: "Réserver un séjour" }}
          />
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <QuickLink href="/app/reservations" icon={CalendarDays} label="Mes réservations" />
        <QuickLink href="/app/services" icon={ConciergeBell} label="Commander un service" />
        <QuickLink href="/app/messages" icon={MessageSquare} label="Écrire à l'équipe" />
      </div>

      {orders && orders.length > 0 && (
        <section className="mt-10">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
            Services récents
          </h2>
          <ul className="mt-3 divide-y divide-line rounded-[var(--radius-lg)] border border-line bg-bone">
            {orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div>
                  <p className="text-[14px] text-ink">
                    {(o.service as { title?: string } | null)?.title ?? "Service"}
                  </p>
                  <p className="text-[12px] text-ink-3">
                    {o.scheduled_for ? formatDate(o.scheduled_for) : "Créneau à définir"}
                  </p>
                </div>
                <StatusBadge status={o.status} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function NextStay({ stay }: { stay: Record<string, unknown> }) {
  const { start, end } = parseRange(stay.date_range as string);
  const nights = nightsBetween(start, end);
  const due = (stay.total_amount as number) - (stay.amount_paid as number);
  return (
    <Card className="!bg-forest !text-bone">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] uppercase tracking-[0.16em] text-sand">Prochain séjour</p>
          <p className="display mt-2 text-[1.5rem]">
            {formatDate(start, { day: "numeric", month: "long" })} — {formatDate(end)}
          </p>
          <p className="mt-1 text-[13px] text-bone/60">
            {nights} nuit{nights > 1 ? "s" : ""} · {String(stay.guests_count)} voyageur
            {(stay.guests_count as number) > 1 ? "s" : ""} · réf. {String(stay.reference)}
          </p>
        </div>
        <StatusBadge status={stay.status as string} />
      </div>

      {stay.status === "pending_payment" && due > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line-dark pt-4">
          <span className="text-[13px] text-bone/70">
            Reste à régler : <span className="tnum font-medium text-bone">{formatXOF(due)}</span>
          </span>
          <Link
            href={`/app/reservations/${stay.reference}`}
            className="press inline-flex h-10 items-center gap-1.5 rounded-full bg-brass px-5 text-[13px] font-medium text-ink hover:bg-brass-2"
          >
            Régler maintenant <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
      {stay.status !== "pending_payment" && (
        <Link
          href={`/app/reservations/${stay.reference}`}
          className="mt-5 inline-flex items-center gap-1.5 border-t border-line-dark pt-4 text-[13px] font-medium text-brass-3"
        >
          Voir le détail <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </Card>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="press group flex items-center gap-3 rounded-[var(--radius-lg)] border border-line bg-bone p-4 transition-colors hover:border-ink/25"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-bone-2 text-forest-2">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
      </span>
      <span className="text-[13.5px] font-medium text-ink">{label}</span>
    </Link>
  );
}
