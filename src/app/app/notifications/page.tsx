import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageTitle } from "@/components/app/ui";
import { NotificationsList } from "@/components/app/notifications-list";
import { getT } from "@/lib/i18n";

export const metadata: Metadata = { title: "Notifications" };

export default async function NotificationsPage() {
  const { t } = await getT();
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("notifications")
    .select("id, type, title, body, created_at, read_at")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title={t("notifPrefs.pageTitle")} />
      <NotificationsList initial={rows ?? []} />
    </div>
  );
}
