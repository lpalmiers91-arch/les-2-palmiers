import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { MessagesThread } from "@/components/app/messages-thread";
import { getT } from "@/lib/i18n";

export const metadata: Metadata = { title: "Messages" };

export default async function MessagesPage() {
  const { t } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .order("last_message_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  let initial: unknown[] = [];

  if (conv) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("id, body, sender_id, system, created_at, attachments, deleted_at, deleted_by")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true })
      .limit(200);
    initial = msgs ?? [];
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="display mb-5 text-[1.7rem] text-ink sm:text-[2rem]">{t("appNav.messages")}</h1>
      <MessagesThread conversationId={conv?.id ?? null} initial={initial as never} meId={user!.id} />
    </div>
  );
}
