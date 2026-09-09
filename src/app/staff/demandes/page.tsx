import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageTitle, EmptyState } from "@/components/app/ui";
import { DemandeCard } from "@/components/console/demande-card";

export const metadata: Metadata = { title: "Demandes de services" };

export default async function DemandesPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  const { f = "actives" } = await searchParams;
  const supabase = await createClient();

  const active = ["requested", "accepted", "scheduled", "in_progress"];
  const filter = f === "toutes" ? undefined : active;

  let q = supabase
    .from("service_orders")
    .select(
      "id, reference, status, price, scheduled_for, options, note, decline_reason, service:services(title, pricing_mode), customer:profiles(full_name)",
    )
    .order("created_at", { ascending: true });
  if (filter) q = q.in("status", filter);

  const [{ data: orders }, { data: providers }] = await Promise.all([
    q,
    supabase.from("providers").select("id, full_name").eq("active", true).order("full_name"),
  ]);

  const rows = (orders ?? []).map((o) => ({
    id: o.id,
    reference: o.reference,
    status: o.status,
    price: o.price,
    pricing_mode: (o.service as { pricing_mode?: string } | null)?.pricing_mode ?? "quote",
    scheduled_for: o.scheduled_for,
    options: (o.options ?? {}) as Record<string, unknown>,
    note: o.note,
    decline_reason: o.decline_reason,
    service_title: (o.service as { title?: string } | null)?.title ?? "Service",
    customer_name: (o.customer as { full_name?: string } | null)?.full_name ?? "Client",
  }));

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle
        title="Demandes de services"
        sub="Accepter, fixer un prix, planifier, affecter, clôturer."
        action={
          <div className="flex gap-1 rounded-full border border-line bg-bone p-1 text-[12.5px]">
            <a href="?f=actives" className={`rounded-full px-3 py-1 ${f !== "toutes" ? "bg-forest text-bone" : "text-ink-2"}`}>
              Actives
            </a>
            <a href="?f=toutes" className={`rounded-full px-3 py-1 ${f === "toutes" ? "bg-forest text-bone" : "text-ink-2"}`}>
              Toutes
            </a>
          </div>
        }
      />

      {rows.length === 0 ? (
        <EmptyState title="File vide" body="Aucune demande à traiter pour l'instant." />
      ) : (
        <ul className="space-y-3">
          {rows.map((o) => (
            <DemandeCard key={o.id} order={o} providers={providers ?? []} />
          ))}
        </ul>
      )}
    </div>
  );
}
