import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageTitle, EmptyState, StatusBadge } from "@/components/app/ui";
import { getT } from "@/lib/i18n";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Contrats" };

type Row = {
  id: string;
  reference: string;
  status: string;
  client_name: string | null;
  reservation_ref: string | null;
  created_at: string;
};

export default async function StaffContracts() {
  const { t } = await getT();
  const supabase = await createClient();
  const { data } = await supabase.rpc("list_contracts");
  const rows = (data ?? []) as Row[];

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title={t("console.title.contrats")} sub={t("console.sub.contrats")} />
      {rows.length === 0 ? (
        <EmptyState title={t("console.empty.contractsT")} body={t("console.empty.contractsB")} />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-bone">
          {rows.map((c) => (
            <li key={c.id}>
              <Link
                href={`/staff/contrats/${c.id}`}
                className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-ink/[0.025]"
              >
                <div className="min-w-0">
                  <p className="text-[14px] text-ink">{c.client_name || "Client"}</p>
                  <p className="text-[12px] text-ink-3">
                    {c.reference} · réf. {c.reservation_ref ?? "—"} · {formatDate(c.created_at)}
                  </p>
                </div>
                <span className="flex items-center gap-2">
                  <StatusBadge status={c.status} />
                  <ChevronRight className="h-4 w-4 text-ink-3" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 flex items-center gap-1.5 text-[12px] text-ink-3">
        <Check className="h-3.5 w-3.5" /> Toute modification s&apos;affiche immédiatement chez le
        client.
      </p>
    </div>
  );
}
