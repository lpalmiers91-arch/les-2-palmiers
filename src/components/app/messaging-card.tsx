"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, ArrowRight } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { ensureRealtimeAuth } from "@/lib/supabase/realtime";
import { useIsOnline } from "@/lib/presence";
import { formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n/provider";

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
  const { t } = useT();
  const router = useRouter();
  const [liveAt, setLiveAt] = useState(lastAt);
  const staffOnline = useIsOnline()("staff");

  // nouveau message -> rafraîchit la date + le compteur (via router.refresh)
  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    let ch: RealtimeChannel | null = null;
    ensureRealtimeAuth().then((supabase) => {
      if (cancelled) return;
      ch = supabase
        .channel(`mc-${conversationId}-${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `conversation_id=eq.${conversationId}`,
          },
          (payload) => {
            setLiveAt((payload.new as { created_at: string }).created_at);
            router.refresh();
          },
        )
        .subscribe();
    });
    return () => {
      cancelled = true;
      if (ch) createClient().removeChannel(ch);
    };
  }, [conversationId, router]);

  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bone-2 text-forest-2">
          <MessageSquare className="h-[18px] w-[18px]" strokeWidth={1.7} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[14px] font-medium text-ink">{t("msgCard.title")}</p>
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
            {staffOnline ? t("msgCard.online") : t("msgCard.offline")}
          </p>
          {liveAt && (
            <p className="mt-1 text-[12px] text-ink-3">
              {t("msgCard.lastExchange")} {formatDate(liveAt, { day: "numeric", month: "short" })}
              {subject ? ` · ${subject}` : ""}
            </p>
          )}
        </div>
      </div>
      <Link
        href="/app/messages"
        className="press mt-4 flex h-10 w-full items-center justify-center gap-1.5 rounded-full bg-ink text-[13px] font-medium text-bone hover:bg-forest-2"
      >
        {conversationId ? t("msgCard.open") : t("msgCard.write")}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
