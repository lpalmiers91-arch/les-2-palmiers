"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { Loader2, Star, Check, EyeOff, MessageSquareReply, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ensureRealtimeAuth } from "@/lib/supabase/realtime";
import { formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n/provider";
import { AiDraftButton } from "@/components/console/ai-draft-button";

export type ReviewRow = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  status: string;
  featured: boolean;
  staff_reply: string | null;
  created_at: string;
  client_name: string | null;
  apartment_name: string | null;
};

function Stars({ n }: { n: number }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`h-3.5 w-3.5 ${i <= n ? "fill-brass text-brass" : "text-line"}`} />
      ))}
    </span>
  );
}

export function ReviewModeration({ rows: initial }: { rows: ReviewRow[] }) {
  const { t } = useT();
  const router = useRouter();
  const [rows, setRows] = useState<ReviewRow[]>(initial);

  // fusion avec les données serveur rafraîchies
  useEffect(() => {
    setRows((prev) => {
      const seen = new Map(prev.map((r) => [r.id, r]));
      for (const r of initial) seen.set(r.id, { ...seen.get(r.id), ...r });
      return [...seen.values()].sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    });
  }, [initial]);

  // temps réel : publication / masquage / réponse par un autre membre
  useEffect(() => {
    let alive = true;
    let ch: RealtimeChannel | null = null;
    ensureRealtimeAuth().then((supabase) => {
      if (!alive) return;
      ch = supabase
        .channel(`reviews-mod-${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "reviews" },
          (payload) => {
            if (payload.eventType === "DELETE") {
              const id = (payload.old as { id?: string })?.id;
              if (id) setRows((p) => p.filter((r) => r.id !== id));
              return;
            }
            const n = payload.new as Partial<ReviewRow> & { id: string };
            setRows((p) => p.map((r) => (r.id === n.id ? { ...r, ...n } : r)));
          },
        )
        .subscribe();
    });
    return () => {
      alive = false;
      if (ch) createClient().removeChannel(ch);
    };
  }, []);

  function patchRow(id: string, patch: Partial<ReviewRow>) {
    setRows((p) => p.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }
  function dropRow(id: string) {
    setRows((p) => p.filter((r) => r.id !== id));
  }

  const pending = rows.filter((r) => r.status === "pending");
  const published = rows.filter((r) => r.status === "published");
  const hidden = rows.filter((r) => r.status === "hidden");

  return (
    <div className="space-y-8">
      <Section title={`${t("console.reviewMod.toModerate")} (${pending.length})`}>
        {pending.length === 0 ? (
          <Empty>{t("console.reviewMod.noneWaiting")}</Empty>
        ) : (
          pending.map((r) => (
            <ReviewCard key={r.id} row={r} onPatch={patchRow} onDrop={dropRow} onSync={router.refresh} t={t} />
          ))
        )}
      </Section>

      <Section title={`${t("console.reviewMod.onSite")} (${published.length})`}>
        {published.length === 0 ? (
          <Empty>{t("console.reviewMod.noneOnSite")}</Empty>
        ) : (
          published.map((r) => (
            <ReviewCard key={r.id} row={r} onPatch={patchRow} onDrop={dropRow} onSync={router.refresh} t={t} />
          ))
        )}
      </Section>

      {hidden.length > 0 && (
        <Section title={`${t("console.status.hidden")} (${hidden.length})`}>
          {hidden.map((r) => (
            <ReviewCard key={r.id} row={r} onPatch={patchRow} onDrop={dropRow} onSync={router.refresh} t={t} />
          ))}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">{title}</h2>
      <div className="mt-3 space-y-3">{children}</div>
    </section>
  );
}
function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-[var(--radius-lg)] border border-dashed border-line bg-bone/60 px-5 py-8 text-center text-[13px] text-ink-3">
      {children}
    </p>
  );
}

function ReviewCard({
  row,
  onPatch,
  onDrop,
  onSync,
  t,
}: {
  row: ReviewRow;
  onPatch: (id: string, p: Partial<ReviewRow>) => void;
  onDrop: (id: string) => void;
  onSync: () => void;
  t: (k: string, v?: Record<string, string | number>) => string;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [reply, setReply] = useState(row.staff_reply ?? "");
  const prev = useRef(row);

  async function act(patch: { status?: string; featured?: boolean; reply?: string }) {
    setBusy(patch.status ?? (patch.featured != null ? "feature" : "reply"));
    prev.current = row;
    // maj optimiste immédiate
    onPatch(row.id, {
      ...(patch.status ? { status: patch.status } : {}),
      ...(patch.featured != null ? { featured: patch.featured } : {}),
      ...(patch.reply ? { staff_reply: patch.reply } : {}),
    });
    setReplyOpen(false);
    try {
      const { error } = await createClient().rpc("moderate_review", {
        p_id: row.id,
        p_status: patch.status ?? row.status,
        p_featured: patch.featured,
        p_reply: patch.reply,
      });
      if (error) throw error;
      onSync();
    } catch {
      onPatch(row.id, prev.current); // rollback
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    if (!confirm(t("console.reviewMod.deleteConfirm"))) return;
    setBusy("delete");
    onDrop(row.id);
    try {
      await createClient().rpc("delete_review", { p_id: row.id });
      onSync();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <Stars n={row.rating} />
            <span className="text-[13px] font-medium text-ink">
              {row.client_name ?? t("console.staffHome.client")}
            </span>
            {row.featured && (
              <span className="rounded-full bg-brass/15 px-1.5 py-0.5 text-[10px] font-medium text-brass">
                {t("console.reviewMod.featuredBadge")}
              </span>
            )}
          </div>
          <p className="text-[11.5px] text-ink-3">
            {row.apartment_name ?? t("console.reviewMod.apartment")} · {formatDate(row.created_at)}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
            row.status === "published"
              ? "bg-green/12 text-green-2"
              : row.status === "hidden"
                ? "bg-ink/8 text-ink-3"
                : "bg-warn/14 text-warn"
          }`}
        >
          {row.status === "published"
            ? t("console.reviewMod.onSiteBadge")
            : row.status === "hidden"
              ? t("console.status.hidden")
              : t("console.status.pending")}
        </span>
      </div>

      {row.title && <p className="mt-3 text-[14px] font-medium text-ink">{row.title}</p>}
      <p className="mt-1 whitespace-pre-wrap text-[13.5px] text-ink-2">{row.body}</p>

      {row.staff_reply && (
        <p className="mt-3 rounded-[10px] bg-bone-2 px-3 py-2 text-[13px] text-ink-2">
          <span className="font-medium text-ink">{t("console.reviewMod.replyLabel")} : </span>
          {row.staff_reply}
        </p>
      )}

      {replyOpen && (
        <div className="mt-3">
          <div className="mb-2">
            <AiDraftButton
              kind="review_reply"
              hasText={!!reply.trim()}
              context={{
                rating: row.rating,
                title: row.title ?? "",
                review: row.body,
                guest: row.client_name ?? "",
                apartment: row.apartment_name ?? "",
              }}
              onText={setReply}
            />
          </div>
          <textarea
            className="field min-h-[70px] resize-y"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder={t("console.reviewMod.replyPlaceholder")}
          />
          <button
            onClick={() => act({ reply: reply.trim() })}
            disabled={busy !== null || reply.trim().length < 2}
            className="press mt-2 flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[12.5px] font-medium text-bone disabled:opacity-50"
          >
            {busy === "reply" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            {t("console.reviewMod.saveReply")}
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {row.status !== "published" ? (
          <button
            onClick={() => act({ status: "published" })}
            disabled={busy !== null}
            className="press flex h-9 items-center gap-1.5 rounded-full bg-green px-4 text-[12.5px] font-medium text-bone hover:opacity-90 disabled:opacity-50"
          >
            {busy === "published" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            {t("console.reviewMod.showOnSite")}
          </button>
        ) : (
          <button
            onClick={() => act({ status: "hidden" })}
            disabled={busy !== null}
            className="press flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-[12.5px] font-medium text-ink hover:border-ink/30 disabled:opacity-50"
          >
            <EyeOff className="h-3.5 w-3.5" /> {t("console.reviewMod.removeFromSite")}
          </button>
        )}
        {row.status === "published" && (
          <button
            onClick={() => act({ featured: !row.featured })}
            disabled={busy !== null}
            className="press flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-[12.5px] font-medium text-ink hover:border-brass/50 disabled:opacity-50"
          >
            <Star className={`h-3.5 w-3.5 ${row.featured ? "fill-brass text-brass" : ""}`} />
            {row.featured ? t("console.reviewMod.unfeature") : t("console.reviewMod.feature")}
          </button>
        )}
        <button
          onClick={() => setReplyOpen((v) => !v)}
          className="press flex h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] text-ink-3 hover:text-ink"
        >
          <MessageSquareReply className="h-3.5 w-3.5" />{" "}
          {row.staff_reply ? t("console.reviewMod.editReply") : t("console.reviewMod.reply")}
        </button>
        <button
          onClick={remove}
          disabled={busy !== null}
          className="press ml-auto flex h-9 items-center gap-1.5 rounded-full px-3 text-[12.5px] text-ink-3 hover:text-danger disabled:opacity-50"
        >
          <Trash2 className="h-3.5 w-3.5" /> {t("console.action.delete")}
        </button>
      </div>
    </div>
  );
}
