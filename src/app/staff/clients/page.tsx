import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageTitle, EmptyState } from "@/components/app/ui";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  const supabase = await createClient();

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, phone, locale, created_at")
    .order("created_at", { ascending: false });

  const { data: staffRows } = await supabase
    .from("user_roles")
    .select("user_id")
    .in("role_id", ["staff", "coordinator", "admin"]);
  const staffIds = new Set((staffRows ?? []).map((r) => r.user_id));

  const clients = (profiles ?? []).filter((p) => !staffIds.has(p.id));

  const { data: resCounts } = await supabase
    .from("reservations")
    .select("guest_id");
  const counts = new Map<string, number>();
  for (const r of resCounts ?? []) counts.set(r.guest_id, (counts.get(r.guest_id) ?? 0) + 1);

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title="Clients" sub={`${clients.length} compte${clients.length > 1 ? "s" : ""} client.`} />
      {clients.length === 0 ? (
        <EmptyState title="Aucun client" body="Les comptes clients apparaîtront ici." />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-bone">
          {clients.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div>
                <p className="text-[14px] text-ink">{c.full_name || "Sans nom"}</p>
                <p className="text-[12px] text-ink-3">
                  {c.phone || "téléphone non renseigné"} · inscrit le {formatDate(c.created_at)}
                </p>
              </div>
              <span className="tnum text-[12.5px] text-ink-3">
                {counts.get(c.id) ?? 0} réservation{(counts.get(c.id) ?? 0) > 1 ? "s" : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
