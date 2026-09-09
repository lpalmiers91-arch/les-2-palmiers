import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConsoleShell } from "@/components/console/console-shell";
import { AssistantWidget } from "@/components/assistant/assistant-widget";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?suite=/admin");

  const { data: roles } = await supabase.from("user_roles").select("role_id").eq("user_id", user.id);
  if (!(roles ?? []).some((r) => r.role_id === "admin")) redirect("/app");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <ConsoleShell variant="admin" userName={profile?.full_name || user.email!}>
      {children}
      <AssistantWidget space="admin" />
    </ConsoleShell>
  );
}
