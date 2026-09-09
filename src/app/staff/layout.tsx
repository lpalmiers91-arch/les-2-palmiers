import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConsoleShell } from "@/components/console/console-shell";
import { AssistantWidget } from "@/components/assistant/assistant-widget";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { I18nProvider } from "@/lib/i18n/provider";
import { getLocale, getMessages } from "@/lib/i18n";

export default async function StaffLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/equipe?suite=/staff");

  const { data: roles } = await supabase.from("user_roles").select("role_id").eq("user_id", user.id);
  const rs = (roles ?? []).map((r) => r.role_id);
  if (!rs.some((r) => ["staff", "coordinator", "admin"].includes(r))) redirect("/app");

  const locale = await getLocale();
  const messages = await getMessages(locale);

  const [{ data: profile }, { data: notifs }] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    supabase
      .from("notifications")
      .select("id, type, title, body, data, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <I18nProvider locale={locale} messages={messages}>
      <ConsoleShell
        variant="staff"
        userName={profile?.full_name || user.email!}
        userId={user.id}
        notifications={notifs ?? []}
      >
        {children}
        <AssistantWidget space="staff" />
        <InstallPrompt />
      </ConsoleShell>
    </I18nProvider>
  );
}
