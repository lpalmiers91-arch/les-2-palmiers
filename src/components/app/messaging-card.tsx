"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MessageSquare, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/format";

export function MessagingCard({
  conversationId,
  subject,
  lastAt,
  unread,
}: {
  conversationId: string | null;
  subject: string | null;
  lastAt: string | null;
  unread: number;
}) {
  const [uid, setUid] = useState<string | null>(null);
  const [liveAt, setLiveAt] = useState(lastAt);
  const [staffOnline, setStaffOnline] = useState(false);

  useEffect(() => {
    createClient()
      .auth.getUser()
      .then(({ data }) => setUid(data.user?.id ?? null));
  }, []);

  // nouveau message -> rafraîchit la date affichée
  useEffect(() => {
    if (!conversationId) return;
    const supabase = createClient();
    const ch = supabase
      .channel(`mc-${conversationId}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => setLiveAt((payload.new as { created_at: string }).created_at),
      );
    ch.subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [conversationId]);

  // présence partagée : suis-je vu par le staff, un staff est-il en ligne ?
  useEffect(() => {
    if (!uid) return;
    const supabase = createClient();
    const ch = supabase.channel("presence:support", {
      config: { presence: { key: uid } },
    });
    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<{ role?: string }>();
      const anyStaff = Object.values(state).some((metas) =>
        (metas as { role?: string }[]).some((m) => m.role === "staff"),
      );
      setStaffOnline(anyStaff);
    });
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") ch.track({ role: "client", user_id: uid });
    });
    return () => {
      ch.untrack();
      supabase.removeChannel(ch);
    };
  }, [uid]);

  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bone-2 text-forest-2">
          <MessageSquare className="h-[18px] w-[18px]" strokeWidth={1.7} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-medium text-ink">Messagerie avec l&apos;équipe</p>
            {unread > 0 && (
              <span className="tnum rounded-full bg-brass px-1.5 text-[11px] font-semibold text-ink">
                {unread}
              </span>
            )}
          </div>
          <p className="mt-0.5 flex items-center gap-1.5 text-[12.5px] text-ink-3">
            <span
              className={`h-1.5 w-1.5 rounded-full ${staffOnline ? "bg-forest-2" : "bg-ink-3/40"}`}
            />
            {staffOnline
              ? "Un conseiller est en ligne"
              : "Laissez un message, l'équipe vous répond vite"}
          </p>
          {liveAt && (
            <p className="mt-1 text-[12px] text-ink-3">
              Dernier échange : {formatDate(liveAt, { day: "numeric", month: "short" })}
              {subject ? ` · ${subject}` : ""}
            </p>
          )}
        </div>
      </div>
      <Link
        href="/app/messages"
        className="press mt-4 flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-ink text-[13px] font-medium text-bone hover:bg-forest-2"
      >
        {conversationId ? "Ouvrir la conversation" : "Écrire à l'équipe"}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
