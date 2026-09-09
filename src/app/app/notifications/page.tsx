import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageTitle } from "@/components/app/ui";
import { NotificationsList } from "@/components/app/notifications-list";

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
      <NotificationsList initial={rows ?? []} />
    </div>
  );
}
