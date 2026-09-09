import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ConsoleShell } from "@/components/console/console-shell";
import { AssistantWidget } from "@/components/assistant/assistant-widget";

export default async function StaffLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?suite=/staff");

  const { data: roles } = await supabase.from("user_roles").select("role_id").eq("user_id", user.id);
  const rs = (roles ?? []).map((r) => r.role_id);
  if (!rs.some((r) => ["staff", "coordinator", "admin"].includes(r))) redirect("/app");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <ConsoleShell variant="staff" userName={profile?.full_name || user.email!}>
      {children}
      <AssistantWidget space="staff" />
    </ConsoleShell>
  );
}
