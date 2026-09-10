import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/app/ui";
import { ReservationActions } from "@/components/console/reservation-actions";
import { ChargesManager, type ManagedCharge } from "@/components/console/charges-manager";
import { SendPaymentDetails } from "@/components/console/send-payment-details";
import { formatXOF, formatDate, parseRange, nightsBetween } from "@/lib/format";
import { getT } from "@/lib/i18n";

export const metadata: Metadata = { title: "Réservation" };

export default async function StaffReservationDetail({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  const { t } = await getT();
  const supabase = await createClient();

  const { data: r } = await supabase
    .from("reservations")
    .select(
      "id, reference, date_range, status, total_amount, amount_paid, guests_count, guest:profiles!reservations_guest_id_fkey(id, full_name, phone), apartment:apartments(name)",
    )
    .eq("reference", decodeURIComponent(ref))
    .maybeSingle();

  if (!r) notFound();

  const [{ data: contract }, { data: chargeRows }, { data: payments }] = await Promise.all([
    supabase
      .from("contracts")
      .select("id, reference, status")
      .eq("reservation_id", r.id)
      .maybeSingle(),
    supabase
      .from("reservation_charges")
      .select(
        "id, reference, kind, label, amount, status, note, created_at, payment:payments!reservation_charges_payment_id_fkey(internal_ref)",
      )
      .eq("reservation_id", r.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("payments")
      .select("internal_ref, method, amount, status, purpose, created_at")
      .eq("reservation_id", r.id)
      .order("created_at", { ascending: false }),
  ]);

  const { start, end } = parseRange(r.date_range as string);
  const nights = nightsBetween(start, end);
  const g = r.guest as { id?: string; full_name?: string; phone?: string } | null;
  const apt = r.apartment as { name?: string } | null;

  const charges: ManagedCharge[] = (chargeRows ?? []).map((c) => ({
    id: c.id as string,
    reference: c.reference as string,
    kind: c.kind as string,
    label: c.label as string,
    amount: Number(c.amount),
    status: c.status as string,
    note: (c.note as string | null) ?? null,
    created_at: c.created_at as string,
    payment_ref: (c.payment as { internal_ref?: string } | null)?.internal_ref ?? null,
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/staff/reservations"
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> {t("console.resvDetail.all")}
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="display text-[1.7rem] text-ink sm:text-[2rem]">
            {formatDate(start, { day: "numeric", month: "long" })} — {formatDate(end)}
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            {apt?.name ? `${apt.name} · ` : ""}
            {g?.full_name ?? t("console.lists.client")}
            {g?.phone ? ` · ${g.phone}` : ""} · {r.guests_count} {t("console.lists.guestsAbbr")} ·{" "}
            {t("console.lists.ref")} {r.reference} · {nights} {t("console.resvDetail.nights")}
          </p>
        </div>
        <StatusBadge status={r.status as string} />
      </div>

      <div className="mt-6 space-y-5">
        <section className="rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
            {t("console.resvDetail.money")}
          </h2>
          <dl className="mt-3 space-y-1.5 text-[13.5px]">
            <div className="flex justify-between">
              <dt className="text-ink-3">{t("appResDetail.total")}</dt>
              <dd className="tnum text-ink">{formatXOF(Number(r.total_amount))}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-ink-3">{t("appResDetail.alreadyPaid")}</dt>
              <dd className="tnum text-ink">{formatXOF(Number(r.amount_paid))}</dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-3">
            <ReservationActions
              id={r.id as string}
              status={r.status as string}
              start={start}
              end={end}
            />
            <SendPaymentDetails
              reservationId={r.id as string}
              suggestedAmount={Math.max(
                0,
                Number(r.total_amount) - Number(r.amount_paid),
              )}
            />
          </div>
        </section>

        <ChargesManager reservationId={r.id as string} initial={charges} />

        {contract && (
          <Link
            href={`/staff/contrats/${contract.id}`}
            className="press flex items-center gap-3 rounded-[var(--radius-lg)] border border-line bg-bone px-5 py-4 hover:border-ink/25"
          >
            <FileText className="h-5 w-5 shrink-0 text-forest-2" />
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-medium text-ink">{t("console.resvDetail.contract")}</p>
              <p className="text-[12px] text-ink-3">{contract.reference}</p>
            </div>
            <StatusBadge status={contract.status as string} />
          </Link>
        )}

        {payments && payments.length > 0 && (
          <section className="rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
              {t("console.title.paiements")}
            </h2>
            <ul className="mt-3 divide-y divide-line">
              {payments.map((p) => (
                <li
                  key={p.internal_ref}
                  className="flex items-center justify-between gap-3 py-2.5 text-[13px]"
                >
                  <span className="text-ink-2">
                    {formatDate(p.created_at as string, { day: "numeric", month: "short" })} ·{" "}
                    {String(p.method).toUpperCase()} · {String(p.purpose)}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="tnum text-ink">{formatXOF(Number(p.amount))}</span>
                    <StatusBadge status={p.status as string} />
                    {p.status === "paid" && (
                      <Link
                        href={`/recu/${encodeURIComponent(p.internal_ref as string)}`}
                        target="_blank"
                        className="text-[11px] text-ink-3 underline underline-offset-2 hover:text-ink"
                      >
                        {t("console.payments.receipt")}
                      </Link>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
