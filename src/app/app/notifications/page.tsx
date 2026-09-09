import type { Metadata } from "next";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageTitle, EmptyState } from "@/components/app/ui";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("notifications")
    .select("id, type, title, body, created_at, read_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title="Notifications" />
      {!rows || rows.length === 0 ? (
        <EmptyState
          title="Rien pour le moment"
          body="Les confirmations, rappels et réponses de l'équipe apparaîtront ici."
        />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-bone">
          {rows.map((n) => (
            <li key={n.id} className="flex gap-3.5 px-5 py-4">
              <span
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  n.read_at ? "bg-bone-2 text-ink-3" : "bg-forest text-bone"
                }`}
              >
                <Bell className="h-4 w-4" strokeWidth={1.7} />
              </span>
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-ink">{n.title}</p>
                {n.body && <p className="mt-0.5 text-[13px] text-ink-2">{n.body}</p>}
                <p className="mt-1 text-[11.5px] text-ink-3">
                  {formatDate(n.created_at, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
