import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageTitle, EmptyState } from "@/components/app/ui";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Messagerie" };

export default async function StaffMessages() {
  const supabase = await createClient();
  const { data: convs } = await supabase
    .from("conversations")
    .select(
      "id, subject, type, status, last_message_at, customer:profiles!conversations_customer_id_fkey(full_name)",
    )
    .order("last_message_at", { ascending: false });

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title="Messagerie" sub="Conversations avec les clients." />
      {!convs || convs.length === 0 ? (
        <EmptyState title="Aucune conversation" body="Les messages des clients apparaîtront ici." />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-bone">
          {convs.map((c) => (
            <li key={c.id}>
              <Link href={`/staff/messages/${c.id}`} className="flex items-center gap-4 px-5 py-4 hover:bg-ink/[0.025]">
                <div className="min-w-0 flex-1">
                  <p className="text-[14px] font-medium text-ink">
                    {(c.customer as { full_name?: string } | null)?.full_name ?? "Client"}
                  </p>
                  <p className="text-[12px] text-ink-3">
                    {c.type === "reservation" ? "Réservation" : "Support"} ·{" "}
                    {formatDate(c.last_message_at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    {c.status === "closed" ? " · fermée" : ""}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-ink-3" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
