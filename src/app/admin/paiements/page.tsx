import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageTitle, StatusBadge, EmptyState } from "@/components/app/ui";
import { RefundButton } from "@/components/console/refund-button";
import { formatXOF, formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Paiements" };

export default async function PaiementsPage() {
  const supabase = await createClient();
  const [{ data: pays }, { data: refunds }] = await Promise.all([
    supabase
      .from("payments")
      .select(
        "id, internal_ref, method, amount, status, purpose, created_at, paid_at, payer:profiles!payments_payer_id_fkey(full_name)",
      )
      .order("created_at", { ascending: false }),
    supabase.from("refunds").select("payment_id, amount"),
  ]);

  const refundedByPayment = new Map<string, number>();
  for (const r of refunds ?? []) {
    refundedByPayment.set(r.payment_id, (refundedByPayment.get(r.payment_id) ?? 0) + Number(r.amount));
  }

  const collected = (pays ?? [])
    .filter((p) => p.status === "paid" || p.status === "partially_refunded")
    .reduce((s, p) => s + Number(p.amount), 0);
  const refundedTotal = [...refundedByPayment.values()].reduce((s, x) => s + x, 0);

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle title="Paiements" sub="Environnement de démonstration — transactions simulées." />

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-5">
          <p className="text-[12px] text-ink-3">Encaissé</p>
          <p className="tnum display mt-1 text-[1.4rem] text-ink">{formatXOF(collected)}</p>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-5">
          <p className="text-[12px] text-ink-3">Remboursé</p>
          <p className="tnum display mt-1 text-[1.4rem] text-ink">{formatXOF(refundedTotal)}</p>
        </div>
      </div>

      {!pays || pays.length === 0 ? (
        <EmptyState title="Aucune transaction" body="Les paiements apparaîtront ici." />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-bone">
          {pays.map((p) => {
            const refunded = refundedByPayment.get(p.id) ?? 0;
            const refundable = (p.status === "paid" || p.status === "partially_refunded") && refunded < Number(p.amount);
            return (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3.5">
                <div>
                  <p className="text-[13.5px] text-ink">
                    {(p.payer as { full_name?: string } | null)?.full_name ?? "Client"} ·{" "}
                    {p.purpose === "reservation" ? "Séjour" : "Service"} · {String(p.method).toUpperCase()}
                  </p>
                  <p className="text-[11.5px] text-ink-3">
                    {p.internal_ref} · {formatDate(p.created_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {refunded > 0 ? ` · remboursé ${formatXOF(refunded)}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="tnum text-[13.5px] font-medium text-ink">{formatXOF(Number(p.amount))}</span>
                  <StatusBadge status={p.status} />
                  {(p.status === "paid" || p.status === "partially_refunded" || p.status === "refunded") && (
                    <Link
                      href={`/recu/${encodeURIComponent(p.internal_ref)}`}
                      target="_blank"
                      className="text-[12px] text-ink-3 underline underline-offset-2 hover:text-ink"
                    >
                      Reçu
                    </Link>
                  )}
                  {refundable && (
                    <RefundButton paymentId={p.id} max={Number(p.amount) - refunded} />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
