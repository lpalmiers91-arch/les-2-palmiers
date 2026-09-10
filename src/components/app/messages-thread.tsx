"use client";

import { useEffect, useRef, useState } from "react";
import { SendHorizonal, Loader2, Paperclip, X, FileText, Trash2 } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";
import { ensureRealtimeAuth } from "@/lib/supabase/realtime";
import { useIsOnline } from "@/lib/presence";
import { formatDate } from "@/lib/format";

type Attachment = { path: string; name: string; type: string };
type Msg = {
  id: string;
  body: string;
  sender_id: string | null;
  system: boolean;
  created_at: string;
  attachments?: Attachment[];
  deleted_at?: string | null;
  deleted_by?: string | null;
};

const SEL = "id, body, sender_id, system, created_at, attachments, deleted_at, deleted_by";

export function MessagesThread({
  conversationId,
  initial,
  meId,
  variant = "client",
  peerId,
  peerName,
}: {
  conversationId: string | null;
  initial: Msg[];
  meId: string;
  variant?: "client" | "staff";
  peerId?: string | null;
  peerName?: string;
}) {
  const { t } = useT();
  const [messages, setMessages] = useState<Msg[]>(initial);
  const [text, setText] = useState("");
  const [convId, setConvId] = useState(conversationId);
  const [sending, setSending] = useState(false);
  const [pending, setPending] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const peerRole = variant === "staff" ? "client" : "staff";
  const isOnline = useIsOnline();
  const peerOnline = isOnline(peerRole, variant === "staff" ? peerId : undefined);
  const canModerate = variant === "staff";

  async function deleteMessage(id: string) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, deleted_at: new Date().toISOString(), deleted_by: meId, body: "", attachments: [] }
          : m,
      ),
    );
    await createClient().rpc("delete_message", { p_message: id });
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  useEffect(() => {
    if (!convId) return;
    const cid = convId;
    let alive = true;
    let channel: RealtimeChannel | null = null;

    async function catchUp() {
      const supabase = createClient();
      const { data } = await supabase
        .from("messages")
        .select(SEL)
        .eq("conversation_id", cid)
        .order("created_at", { ascending: true });
      if (alive && data) setMessages(data as unknown as Msg[]);
    }

    ensureRealtimeAuth().then((supabase) => {
      if (!alive) return;
      channel = supabase
        .channel(`conv-${cid}-${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${cid}` },
          (payload) => {
            const m = payload.new as Msg;
            if (!m?.id) return;
            setMessages((prev) =>
              prev.some((x) => x.id === m.id)
                ? prev.map((x) => (x.id === m.id ? { ...x, ...m } : x))
                : [...prev, m],
            );
          },
        )
        .subscribe((status) => {
          if (status === "SUBSCRIBED") catchUp();
        });
    });

    const poll = window.setInterval(catchUp, 5_000);
    const onVisible = () => document.visibilityState === "visible" && catchUp();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      alive = false;
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) createClient().removeChannel(channel);
    };
  }, [convId]);

  useEffect(() => {
    if (!convId || !meId) return;
    const unread = messages.filter((m) => m.sender_id && m.sender_id !== meId).map((m) => m.id);
    if (unread.length === 0) return;
    createClient()
      .from("message_reads")
      .upsert(
        unread.map((message_id) => ({ message_id, user_id: meId })),
        { onConflict: "message_id,user_id", ignoreDuplicates: true },
      )
      .then(() => {}, () => {});
  }, [messages, convId, meId]);

  async function onPickFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setErr(null);
    setUploading(true);
    const supabase = createClient();
    try {
      // il faut une conversation avant d'écrire dans son dossier
      let cid = convId;
      if (!cid) {
        const { data } = await supabase.rpc("open_support_conversation", { p_subject: "Support" });
        cid = (data as { id: string }).id;
        setConvId(cid);
      }
      const uploaded: Attachment[] = [];
      for (const file of files) {
        if (file.size > 15 * 1024 * 1024) {
          setErr(t("thread.fileTooBig"));
          continue;
        }
        const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
        const path = `${cid}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
        const { error } = await supabase.storage
          .from("message-attachments")
          .upload(path, file, { contentType: file.type });
        if (error) throw error;
        uploaded.push({ path, name: file.name, type: file.type || "application/octet-stream" });
      }
      setPending((p) => [...p, ...uploaded]);
    } catch {
      setErr(t("thread.uploadFailed"));
    } finally {
      setUploading(false);
    }
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if ((!body && pending.length === 0) || sending) return;
    setSending(true);
    setErr(null);
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
        p_attachments: pending as unknown as never,
      });
      if (error) throw error;
      const m = data as unknown as Msg;
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
      setText("");
      setPending([]);
    } catch {
      setErr(t("thread.sendFailed"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-160px)] flex-col rounded-[var(--radius-lg)] border border-line bg-bone lg:h-[calc(100dvh-120px)]">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3 sm:px-6">
        <span className={`h-2 w-2 rounded-full ${peerOnline ? "bg-forest-2" : "bg-ink-3/40"}`} />
        <p className="text-[13px] font-medium text-ink">
          {variant === "staff" ? peerName || t("thread.client") : t("thread.team")}
        </p>
        <p className="text-[12px] text-ink-3">
          {peerOnline
            ? t("thread.online")
            : variant === "staff"
              ? t("thread.offline")
              : t("thread.willReply")}
        </p>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
        {messages.length === 0 && (
          <p className="mt-8 text-center text-[13.5px] text-ink-3">
            {t("thread.emptyHint")}
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
          const deleted = !!m.deleted_at;
          const deletedByMe = m.deleted_by === meId;
          const canDelete = !deleted && (mine || canModerate);
          return (
            <div key={m.id} className={`group flex items-end gap-1.5 ${mine ? "justify-end" : "justify-start"}`}>
              {mine && canDelete && (
                <button
                  onClick={() => deleteMessage(m.id)}
                  aria-label={t("thread.deleteMsg")}
                  className="press mb-4 shrink-0 p-1 text-ink-3 opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
              <div
                className={`max-w-[80%] space-y-2 rounded-[14px] px-3.5 py-2.5 text-[14px] leading-snug ${
                  deleted
                    ? "border border-dashed border-line bg-transparent text-ink-3 italic"
                    : mine
                      ? "bg-forest text-bone"
                      : "bg-bone-2 text-ink"
                }`}
              >
                {deleted ? (
                  <p className="text-[13px]">
                    {deletedByMe
                      ? t("thread.deletedByYou")
                      : variant === "staff"
                        ? t("thread.deletedByClient")
                        : t("thread.deletedByTeam")}
                  </p>
                ) : (
                  <>
                    {Array.isArray(m.attachments) && m.attachments.length > 0 && (
                      <MessageAttachments attachments={m.attachments} mine={mine} />
                    )}
                    {m.body && <p className="whitespace-pre-wrap">{m.body}</p>}
                  </>
                )}
                <p className={`text-[10.5px] ${deleted ? "text-ink-3/70" : mine ? "text-bone/55" : "text-ink-3"}`}>
                  {formatDate(m.created_at, {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              </div>
              {!mine && canDelete && (
                <button
                  onClick={() => deleteMessage(m.id)}
                  aria-label={t("thread.deleteMsg")}
                  className="press mb-4 shrink-0 p-1 text-ink-3 opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {(pending.length > 0 || uploading) && (
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-3 pt-2.5">
          {pending.map((a, i) => (
            <span
              key={a.path}
              className="flex items-center gap-1.5 rounded-full bg-bone-2 py-1 pl-2.5 pr-1 text-[12px] text-ink"
            >
              <Paperclip className="h-3 w-3" />
              <span className="max-w-[120px] truncate">{a.name}</span>
              <button
                type="button"
                onClick={() => setPending((p) => p.filter((_, j) => j !== i))}
                className="press rounded-full p-0.5 text-ink-3 hover:text-danger"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          {uploading && <Loader2 className="h-3.5 w-3.5 animate-spin text-ink-3" />}
        </div>
      )}
      {err && <p className="px-3 pt-1 text-[12px] text-danger">{err}</p>}

      <form onSubmit={send} className="flex items-end gap-2 border-t border-line p-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label={t("thread.attach")}
          className="press flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full text-ink-3 hover:bg-ink/5 hover:text-ink"
        >
          <Paperclip className="h-[18px] w-[18px]" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          onChange={onPickFiles}
        />
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
          placeholder={t("thread.placeholder")}
          className="field max-h-32 min-h-[46px] flex-1 resize-none py-3"
        />
        <button
          type="submit"
          disabled={sending || (!text.trim() && pending.length === 0)}
          aria-label={t("thread.send")}
          className="press flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full bg-ink text-bone hover:bg-forest-2 disabled:opacity-40"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <SendHorizonal className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}

function MessageAttachments({ attachments, mine }: { attachments: Attachment[]; mine: boolean }) {
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    const supabase = createClient();
    const paths = attachments.map((a) => a.path);
    supabase.storage
      .from("message-attachments")
      .createSignedUrls(paths, 3600)
      .then(({ data }) => {
        if (!data) return;
        const m: Record<string, string> = {};
        data.forEach((d, i) => {
          if (d.signedUrl) m[paths[i]] = d.signedUrl;
        });
        setUrls(m);
      });
  }, [attachments]);

  return (
    <div className="grid gap-2">
      {attachments.map((a) => {
        const url = urls[a.path];
        const isImg = a.type.startsWith("image/");
        if (isImg) {
          return (
            <a key={a.path} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-[10px]">
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={url} alt={a.name} className="max-h-56 w-full object-cover" />
              ) : (
                <span className="flex h-24 items-center justify-center bg-black/10 text-[12px]">…</span>
              )}
            </a>
          );
        }
        return (
          <a
            key={a.path}
            href={url}
            target="_blank"
            rel="noreferrer"
            className={`flex items-center gap-2 rounded-[10px] px-2.5 py-2 text-[12.5px] ${
              mine ? "bg-bone/15" : "bg-ink/5"
            }`}
          >
            <FileText className="h-4 w-4 shrink-0" />
            <span className="truncate">{a.name}</span>
          </a>
        );
      })}
    </div>
  );
}
