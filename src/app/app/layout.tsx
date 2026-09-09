import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app/app-shell";
import { AssistantWidget } from "@/components/assistant/assistant-widget";
import { InstallPrompt } from "@/components/pwa/install-prompt";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?suite=/app");

  const [{ data: profile }, { data: notifs }, { data: msgs }, { data: idStatus }] =
    await Promise.all([
      supabase.from("profiles").select("full_name, avatar_url").eq("id", user.id).maybeSingle(),
      supabase
        .from("notifications")
        .select("id, type, title, body, data, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(20),
      supabase.from("messages").select("id, sender_id, created_at").neq("sender_id", user.id),
      supabase.rpc("identity_status", { uid: user.id }),
    ]);

  // messages non lus = messages du staff sans accusé de lecture de ma part
  let unreadMessages = 0;
  if (msgs && msgs.length > 0) {
    const { data: reads } = await supabase
      .from("message_reads")
      .select("message_id")
      .eq("user_id", user.id);
    const readSet = new Set((reads ?? []).map((r) => r.message_id));
    unreadMessages = msgs.filter((m) => !readSet.has(m.id)).length;
  }

  return (
    <AppShell
      userName={profile?.full_name || user.email || "Mon compte"}
      userId={user.id}
      notifications={notifs ?? []}
      unreadMessages={unreadMessages}
      avatarUrl={profile?.avatar_url ?? null}
      identityStatus={typeof idStatus === "string" ? idStatus : "none"}
    >
      {children}
      <AssistantWidget space="client" />
      <InstallPrompt />
    </AppShell>
  );
}
