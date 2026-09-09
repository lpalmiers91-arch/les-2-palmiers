import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app/app-shell";
import { AssistantWidget } from "@/components/assistant/assistant-widget";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?suite=/app");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const { count: unread } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .neq("sender_id", user.id);

  return (
    <AppShell
      userName={profile?.full_name || user.email || "Mon compte"}
      unread={unread ?? 0}
    >
      {children}
      <AssistantWidget space="client" />
    </AppShell>
  );
}
