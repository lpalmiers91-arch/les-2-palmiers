"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Star, Check, EyeOff, MessageSquareReply } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n/provider";

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
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i <= n ? "fill-brass text-brass" : "text-line"}`}
        />
      ))}
    </span>
  );
}

export function ReviewModeration({ rows }: { rows: ReviewRow[] }) {
  const { t } = useT();
  const pending = rows.filter((r) => r.status === "pending");
  const others = rows.filter((r) => r.status !== "pending");
  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
          {t("console.reviewMod.toModerate")} ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="mt-3 rounded-[var(--radius-lg)] border border-dashed border-line bg-bone/60 px-5 py-8 text-center text-[13px] text-ink-3">
            {t("console.reviewMod.noneWaiting")}
          </p>
        ) : (
          <div className="mt-3 space-y-3">
            {pending.map((r) => (
              <ReviewCard key={r.id} row={r} />
            ))}
          </div>
        )}
      </section>
      {others.length > 0 && (
        <section>
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
            {t("console.reviewMod.publishedHidden")}
          </h2>
          <div className="mt-3 space-y-3">
            {others.map((r) => (
              <ReviewCard key={r.id} row={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ReviewCard({ row }: { row: ReviewRow }) {
  const router = useRouter();
  const { t } = useT();
  const [busy, setBusy] = useState<string | null>(null);
  const [replyOpen, setReplyOpen] = useState(false);
  const [reply, setReply] = useState(row.staff_reply ?? "");

  async function act(patch: { status?: string; featured?: boolean; reply?: string }) {
    setBusy(patch.status ?? (patch.featured != null ? "feature" : "reply"));
    try {
      const { error } = await createClient().rpc("moderate_review", {
        p_id: row.id,
        p_status: patch.status ?? row.status,
        p_featured: patch.featured,
        p_reply: patch.reply,
      });
      if (error) throw error;
      router.refresh();
      setReplyOpen(false);
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
              ? "bg-ok/12 text-forest-2"
              : row.status === "hidden"
                ? "bg-ink/8 text-ink-3"
                : "bg-warn/12 text-warn"
          }`}
        >
          {row.status === "published"
            ? t("console.status.published")
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
            {busy === "reply" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {t("console.reviewMod.saveReply")}
          </button>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {row.status !== "published" && (
          <button
            onClick={() => act({ status: "published" })}
            disabled={busy !== null}
            className="press flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[12.5px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
          >
            {busy === "published" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {t("console.action.publish")}
          </button>
        )}
        {row.status !== "hidden" && (
          <button
            onClick={() => act({ status: "hidden" })}
            disabled={busy !== null}
            className="press flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-[12.5px] font-medium text-ink hover:border-ink/30 disabled:opacity-50"
          >
            <EyeOff className="h-3.5 w-3.5" /> {t("console.reviewMod.hide")}
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
      </div>
    </div>
  );
}
