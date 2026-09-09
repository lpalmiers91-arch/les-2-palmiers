import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, StatusBadge } from "@/components/app/ui";
import { PaymentPanel } from "@/components/app/payment-panel";
import { formatXOF, formatDate, parseRange, nightsBetween } from "@/lib/format";

export default async function ReservationDetail({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  const supabase = await createClient();

  const { data: r } = await supabase
    .from("reservations")
    .select("*")
    .eq("reference", decodeURIComponent(ref))
    .maybeSingle();

  if (!r) notFound();

  const { start, end } = parseRange(r.date_range as string);
  const nights = nightsBetween(start, end);
  const total = r.total_amount as number;
  const paid = r.amount_paid as number;
  const deposit = (r.deposit_amount as number) || total;
  const dueNow = Math.max(0, deposit - paid); // acompte restant
  const balance = Math.max(0, total - paid); // solde total restant
  const fees = (r.fees ?? {}) as Record<string, number>;

  const { data: payments } = await supabase
    .from("payments")
    .select("internal_ref, method, amount, status, created_at")
    .eq("reservation_id", r.id)
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/app/reservations"
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Toutes les réservations
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="display text-[1.7rem] text-ink sm:text-[2rem]">
            {formatDate(start, { day: "numeric", month: "long" })} — {formatDate(end)}
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            Réf. {r.reference} · {nights} nuit{nights > 1 ? "s" : ""} · {String(r.guests_count)}{" "}
            voyageur{(r.guests_count as number) > 1 ? "s" : ""}
          </p>
        </div>
        <StatusBadge status={r.status as string} />
      </div>

      <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          {r.status === "pending_payment" && dueNow > 0 && (
            <PaymentPanel purpose="reservation" targetId={r.id as string} amountDue={dueNow} />
          )}
          {r.status === "confirmed" && balance > 0 && (
            <PaymentPanel
              purpose="reservation"
              targetId={r.id as string}
              amountDue={balance}
              label="Régler le solde"
            />
          )}

          <Card>
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
              Détail du prix
            </h2>
            <dl className="mt-4 space-y-2 text-[14px]">
              <Line label={`Hébergement · ${nights} nuit${nights > 1 ? "s" : ""}`}>
                {formatXOF((r.nightly_price as number) * nights)}
              </Line>
              {fees.cleaning_fee != null && (
                <Line label="Ménage">{formatXOF(fees.cleaning_fee)}</Line>
              )}
              {(r.discount_amount as number) > 0 && (
                <Line label="Remise">
                  <span className="text-forest-2">−{formatXOF(r.discount_amount as number)}</span>
                </Line>
              )}
              <div className="flex justify-between border-t border-line pt-2 font-medium text-ink">
                <dt>Total</dt>
                <dd className="tnum">{formatXOF(r.total_amount as number)}</dd>
              </div>
              <Line label="Déjà réglé">{formatXOF(paid)}</Line>
              {balance > 0 && (
                <Line label="Reste à régler">
                  <span className="font-medium text-ink">{formatXOF(balance)}</span>
                </Line>
              )}
            </dl>
          </Card>

          {payments && payments.length > 0 && (
            <Card>
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
                Paiements
              </h2>
              <ul className="mt-3 divide-y divide-line">
                {payments.map((p) => (
                  <li key={p.internal_ref} className="flex items-center justify-between py-2.5 text-[13.5px]">
                    <span className="text-ink-2">
                      {formatDate(p.created_at as string, { day: "numeric", month: "short" })} ·{" "}
                      {String(p.method).toUpperCase()}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="tnum text-ink">{formatXOF(p.amount as number)}</span>
                      <StatusBadge status={p.status as string} />
                      {p.status === "paid" && (
                        <Link
                          href={`/recu/${encodeURIComponent(p.internal_ref as string)}`}
                          target="_blank"
                          className="text-[12px] text-ink-3 underline underline-offset-2 hover:text-ink"
                        >
                          Reçu
                        </Link>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          <Card>
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
              Votre séjour
            </h3>
            <dl className="mt-3 space-y-2 text-[13.5px]">
              <Line label="Arrivée">à partir de 14 h</Line>
              <Line label="Départ">avant 11 h</Line>
              <Line label="Adresse">communiquée avant l'arrivée</Line>
            </dl>
          </Card>
          <Link
            href="/app/services"
            className="press flex items-center justify-center rounded-[var(--radius-lg)] border border-line bg-bone px-5 py-4 text-[13.5px] font-medium text-ink hover:border-ink/25"
          >
            Ajouter un service à ce séjour
          </Link>
          <Link
            href="/app/messages"
            className="block text-center text-[13px] text-ink-3 underline underline-offset-2 hover:text-ink"
          >
            Une question ? Écrire à l'équipe
          </Link>
        </aside>
      </div>
    </div>
  );
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-3">{label}</dt>
      <dd className="tnum text-right text-ink">{children}</dd>
    </div>
  );
}
