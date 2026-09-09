import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Mark } from "@/components/brand/mark";
import { PrintButton } from "@/components/app/print-button";
import { site } from "@/lib/site";
import { formatXOF, formatDate, parseRange } from "@/lib/format";

export const metadata: Metadata = { title: "Reçu", robots: { index: false } };

const methodLabel: Record<string, string> = {
  mtn: "MTN Mobile Money",
  moov: "Moov Money",
  celtis: "Celtis Cash",
  card: "Carte bancaire",
};

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  const supabase = await createClient();

  const { data: p } = await supabase
    .from("payments")
    .select(
      "internal_ref, method, amount, currency, status, purpose, paid_at, created_at, reservation:reservations(reference, date_range, guests_count), service_order:service_orders(reference, service:services(title)), payer:profiles(full_name)",
    )
    .eq("internal_ref", decodeURIComponent(ref))
    .maybeSingle();

  if (!p) notFound();

  const res = p.reservation as { reference?: string; date_range?: string; guests_count?: number } | null;
  const ord = p.service_order as { reference?: string; service?: { title?: string } } | null;
  const paidAt = p.paid_at ?? p.created_at;

  return (
    <div className="min-h-dvh bg-bone-2 px-4 py-10 print:bg-white print:p-0">
      <div className="mx-auto max-w-lg">
        <div className="mb-4 flex justify-end print:hidden">
          <PrintButton />
        </div>

        <article className="rounded-[var(--radius-lg)] border border-line bg-bone p-8 print:rounded-none print:border-0 print:p-6">
          <header className="flex items-start justify-between border-b border-ink/15 pb-5">
            <div className="flex items-center gap-2.5">
              <Mark className="h-9 w-9" tone="ink" />
              <div>
                <p className="display text-[1.1rem] text-ink">Les 2 Palmiers</p>
                <p className="text-[11px] text-ink-3">{site.city}, {site.country}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-[0.14em] text-ink-3">Reçu</p>
              <p className="tnum text-[13px] font-medium text-ink">{p.internal_ref}</p>
            </div>
          </header>

          <div className="mt-5 space-y-2.5 text-[13.5px]">
            <Row label="Date">{formatDate(paidAt, { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}</Row>
            <Row label="Client">{(p.payer as { full_name?: string } | null)?.full_name ?? "—"}</Row>
            <Row label="Moyen de paiement">{methodLabel[p.method] ?? p.method}</Row>
            <Row label="Statut">
              {p.status === "paid"
                ? "Payé"
                : p.status === "refunded"
                  ? "Remboursé"
                  : p.status === "partially_refunded"
                    ? "Partiellement remboursé"
                    : p.status}
            </Row>
          </div>

          <div className="mt-6 border-t border-ink/15 pt-5">
            <p className="text-[11px] uppercase tracking-[0.14em] text-ink-3">Objet</p>
            {p.purpose === "reservation" && res ? (
              <div className="mt-2 text-[13.5px]">
                <p className="text-ink">Séjour · appartement Les 2 Palmiers</p>
                <p className="text-ink-3">
                  {res.date_range
                    ? (() => {
                        const { start, end } = parseRange(res.date_range!);
                        return `${formatDate(start)} — ${formatDate(end)}`;
                      })()
                    : ""}{" "}
                  · {res.guests_count} voyageur{(res.guests_count ?? 1) > 1 ? "s" : ""} · réf. {res.reference}
                </p>
              </div>
            ) : ord ? (
              <div className="mt-2 text-[13.5px]">
                <p className="text-ink">{ord.service?.title ?? "Service à domicile"}</p>
                <p className="text-ink-3">Réf. {ord.reference}</p>
              </div>
            ) : (
              <p className="mt-2 text-[13.5px] text-ink">Paiement</p>
            )}
          </div>

          <div className="mt-6 flex items-baseline justify-between border-t border-ink/15 pt-5">
            <span className="text-[14px] font-medium text-ink">Montant réglé</span>
            <span className="tnum display text-[1.5rem] text-ink">{formatXOF(Number(p.amount))}</span>
          </div>

          <footer className="mt-8 border-t border-ink/15 pt-4 text-[11px] leading-relaxed text-ink-3">
            {site.legalName} · {site.email} · {site.phones[0]}
            <br />
            Environnement de démonstration — transaction simulée. Ce document n'a pas
            de valeur fiscale.
          </footer>
        </article>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-ink-3">{label}</span>
      <span className="tnum text-right text-ink">{children}</span>
    </div>
  );
}
