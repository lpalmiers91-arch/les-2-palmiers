import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageTitle, StatusBadge } from "@/components/app/ui";
import { PaymentProofReview, type ProofRow } from "@/components/console/payment-proof-review";
import { formatXOF, formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Paiements" };

export default async function StaffPayments() {
  const supabase = await createClient();

  const [{ data: pending }, { data: recent }] = await Promise.all([
    supabase
      .from("payments")
      .select(
        "id, internal_ref, amount, method, purpose, proof_path, proof_note, created_at, payer:profiles!payments_payer_id_fkey(full_name), reservation:reservations!payments_reservation_id_fkey(reference)",
      )
      .eq("status", "awaiting_review")
      .order("created_at", { ascending: true }),
    supabase
      .from("payments")
      .select(
        "id, internal_ref, amount, method, status, channel, created_at, payer:profiles!payments_payer_id_fkey(full_name)",
      )
      .neq("status", "awaiting_review")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const rows: ProofRow[] = (pending ?? []).map((p) => ({
    id: p.id,
    internal_ref: p.internal_ref,
    amount: Number(p.amount),
    method: p.method,
    purpose: p.purpose,
    proof_path: p.proof_path,
    proof_note: p.proof_note,
    created_at: p.created_at as string,
    payer_name: (p.payer as { full_name?: string } | null)?.full_name ?? null,
    reservation_ref: (p.reservation as { reference?: string } | null)?.reference ?? null,
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle
        title="Paiements"
        sub={
          rows.length > 0
            ? `${rows.length} preuve${rows.length > 1 ? "s" : ""} à vérifier.`
            : "Preuves de paiement à valider et historique."
        }
      />

      <section>
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
          À vérifier
        </h2>
        <div className="mt-3">
          <PaymentProofReview rows={rows} />
        </div>
      </section>

      {recent && recent.length > 0 && (
        <section className="mt-8">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
            Historique
          </h2>
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-bone">
            {recent.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3 text-[13px]">
                <div className="min-w-0">
                  <p className="truncate text-ink">
                    {(p.payer as { full_name?: string } | null)?.full_name ?? "Client"} ·{" "}
                    {formatXOF(Number(p.amount))}
                  </p>
                  <p className="text-[11.5px] text-ink-3">
                    {formatDate(p.created_at as string)} · {p.channel === "proof" ? "preuve" : "en ligne"}
                  </p>
                </div>
                <span className="flex items-center gap-2">
                  <StatusBadge status={p.status as string} />
                  {(p.status === "paid" || p.status === "refunded") && (
                    <Link
                      href={`/recu/${encodeURIComponent(p.internal_ref)}`}
                      target="_blank"
                      className="text-[11px] text-ink-3 underline underline-offset-2 hover:text-ink"
                    >
                      Reçu
                    </Link>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
