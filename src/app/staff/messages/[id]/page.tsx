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
    .select("id, customer_id, customer:profiles(full_name)")
    .eq("id", id)
    .maybeSingle();
  if (!conv) notFound();
  const customerName = (conv.customer as { full_name?: string } | null)?.full_name ?? "Client";

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
      <div className="mb-4 mt-3 flex items-center justify-between gap-3">
        <h1 className="display text-[1.5rem] text-ink">{customerName}</h1>
        <Link
          href={`/staff/clients/${conv.customer_id}`}
          className="text-[12.5px] text-ink-3 underline underline-offset-2 hover:text-ink"
        >
          Fiche client
        </Link>
      </div>
      <MessagesThread
        conversationId={id}
        initial={msgs ?? []}
        meId={user!.id}
        variant="staff"
        peerId={conv.customer_id as string}
        peerName={customerName}
      />
    </div>
  );
}
