import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { MessagesThread } from "@/components/app/messages-thread";

export default async function StaffConversation({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: conv } = await supabase
    .from("conversations")
    .select("id, customer:profiles(full_name)")
    .eq("id", id)
    .maybeSingle();
  if (!conv) notFound();

  const { data: msgs } = await supabase
    .from("messages")
    .select("id, body, sender_id, system, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })
    .limit(200);

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/staff/messages" className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink">
        <ArrowLeft className="h-4 w-4" /> Conversations
      </Link>
      <h1 className="display mb-4 mt-3 text-[1.5rem] text-ink">
        {(conv.customer as { full_name?: string } | null)?.full_name ?? "Client"}
      </h1>
      <MessagesThread conversationId={id} initial={msgs ?? []} meId={user!.id} />
    </div>
  );
}
