import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageTitle, EmptyState } from "@/components/app/ui";
import { getT } from "@/lib/i18n";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  const { t } = await getT();
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
      <PageTitle title={t("console.title.clients")} sub={t("console.sub.clients")} />
      {clients.length === 0 ? (
        <EmptyState title={t("console.empty.clientsT")} body={t("console.empty.clientsB")} />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-bone">
          {clients.map((c) => (
            <li key={c.id}>
              <Link
                href={`/staff/clients/${c.id}`}
                className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-ink/[0.03]"
              >
                <div>
                  <p className="text-[14px] text-ink">
                    {c.full_name || t("console.catEditor.untitled")}
                  </p>
                  <p className="text-[12px] text-ink-3">
                    {c.phone || t("console.lists.phoneMissing")} · {t("console.lists.registeredOn")}{" "}
                    {formatDate(c.created_at)}
                  </p>
                </div>
                <span className="flex items-center gap-2">
                  <span className="tnum text-[12.5px] text-ink-3">
                    {counts.get(c.id) ?? 0} {t("console.lists.resAbbr")}
                  </span>
                  <ChevronRight className="h-4 w-4 text-ink-3" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
