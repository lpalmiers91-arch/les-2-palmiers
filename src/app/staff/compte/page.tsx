import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageTitle } from "@/components/app/ui";
import { getT } from "@/lib/i18n";
import { ProfileBasicForm } from "@/components/console/profile-basic-form";
import { NotificationPrefs } from "@/components/app/notification-prefs";

export const metadata: Metadata = { title: "Mon compte" };

export default async function StaffAccount() {
  const { t } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, avatar_url, preferences")
    .eq("id", user!.id)
    .maybeSingle();

  const notif =
    ((profile?.preferences ?? {}) as { notif?: { email?: boolean; push?: boolean } }).notif ?? {};

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title={t("profileForm.title")} sub={t("profileForm.sub")} />
      <ProfileBasicForm
        userId={user!.id}
        email={user!.email ?? ""}
        initial={{
          full_name: profile?.full_name ?? "",
          phone: profile?.phone ?? "",
          avatar_url: profile?.avatar_url ?? null,
        }}
      />
      <div className="mt-5">
        <NotificationPrefs initialEmail={notif.email !== false} initialPush={notif.push !== false} />
      </div>
    </div>
  );
}
