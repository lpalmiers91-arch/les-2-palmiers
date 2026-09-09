"use client";

import { useEffect, useRef, useState } from "react";
import { SendHorizonal, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/format";

type Msg = {
  id: string;
  body: string;
  sender_id: string | null;
  system: boolean;
  created_at: string;
};

export function MessagesThread({
  conversationId,
  initial,
  meId,
}: {
  conversationId: string | null;
  initial: Msg[];
  meId: string;
}) {
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [text, setText] = useState("");
  const [convId, setConvId] = useState(conversationId);
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  useEffect(() => {
    if (!convId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`conv-${convId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${convId}` },
        (payload) => {
          const m = payload.new as Msg;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [convId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const supabase = createClient();
      let cid = convId;
      if (!cid) {
        const { data } = await supabase.rpc("open_support_conversation", { p_subject: "Support" });
        cid = (data as { id: string }).id;
        setConvId(cid);
      }
      const { data, error } = await supabase.rpc("send_message", {
        p_conversation: cid,
        p_body: body,
        p_attachments: [],
      });
      if (error) throw error;
      const m = data as Msg;
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      setText("");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-160px)] flex-col rounded-[var(--radius-lg)] border border-line bg-bone lg:h-[calc(100dvh-120px)]">
      <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
        {messages.length === 0 && (
          <p className="mt-8 text-center text-[13.5px] text-ink-3">
            Écrivez à l'équipe : arrivée, services, questions sur le séjour.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === meId;
          if (m.system) {
            return (
              <p key={m.id} className="text-center text-[12px] text-ink-3">
                {m.body}
              </p>
            );
          }
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[78%] rounded-[14px] px-3.5 py-2.5 text-[14px] leading-snug ${
                  mine ? "bg-forest text-bone" : "bg-bone-2 text-ink"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className={`mt-1 text-[10.5px] ${mine ? "text-bone/55" : "text-ink-3"}`}>
                  {formatDate(m.created_at, { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <form onSubmit={send} className="flex items-end gap-2 border-t border-line p-3">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send(e as unknown as React.FormEvent);
            }
          }}
          rows={1}
          placeholder="Votre message…"
          className="field max-h-32 min-h-[46px] flex-1 resize-none py-3"
        />
        <button
          type="submit"
          disabled={sending || !text.trim()}
          aria-label="Envoyer"
          className="press flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-ink text-bone hover:bg-forest-2 disabled:opacity-40"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
