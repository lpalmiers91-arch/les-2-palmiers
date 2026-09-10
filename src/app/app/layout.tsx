import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/app/app-shell";
import { AssistantWidget } from "@/components/assistant/assistant-widget";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { PushSetup } from "@/components/pwa/push-setup";
import { LiveRefresh } from "@/components/realtime/live-refresh";
import { I18nProvider } from "@/lib/i18n/provider";
import { getLocale, getMessages } from "@/lib/i18n";
import { audienceFromRoles, homeFor } from "@/lib/spaces";
import { aiSpaceEnabled } from "@/lib/ai";
import { CurrencyProvider } from "@/lib/currency";
import { getFxConfig } from "@/lib/fx";
import { autoCurrency } from "@/lib/geo";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?suite=/app");

  // Cloisonnement : un membre de l'équipe n'entre jamais dans l'espace client.
  const { data: roleRows, error: rolesError } = await supabase
    .from("user_roles")
    .select("role_id")
    .eq("user_id", user.id);
  // en cas d'erreur on ne devine pas : on renvoie vers la connexion (fail-closed).
  if (rolesError) redirect("/connexion?suite=/app");
  const roles = (roleRows ?? []).map((r) => r.role_id as string);
  if (audienceFromRoles(roles) === "team") redirect(homeFor("team", roles));

  const locale = await getLocale();
  const messages = await getMessages(locale);

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
  const [aiOn, { data: loyaltyCfg }, fx, curr] = await Promise.all([
    aiSpaceEnabled("client"),
    supabase.from("loyalty_settings").select("enabled").eq("id", 1).maybeSingle(),
    getFxConfig(),
    autoCurrency(),
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
    <I18nProvider locale={locale} messages={messages}>
      <CurrencyProvider rates={fx.rates} enabled={fx.enabled} initial={curr}>
        <AppShell
          userName={profile?.full_name || user.email || "Mon compte"}
          userEmail={user.email ?? null}
          userId={user.id}
          notifications={notifs ?? []}
          unreadMessages={unreadMessages}
          avatarUrl={profile?.avatar_url ?? null}
          identityStatus={typeof idStatus === "string" ? idStatus : "none"}
          loyaltyEnabled={loyaltyCfg?.enabled ?? false}
        >
          {children}
          <LiveRefresh space="client" userId={user.id} />
          {aiOn && <AssistantWidget space="client" />}
          <InstallPrompt />
          <PushSetup />
        </AppShell>
      </CurrencyProvider>
    </I18nProvider>
  );
}
