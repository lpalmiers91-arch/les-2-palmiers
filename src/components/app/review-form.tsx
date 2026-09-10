"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Star, Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";

export function ReviewForm({
  reservationId,
  existing,
}: {
  reservationId: string;
  existing: { rating: number; title: string | null; body: string; status: string } | null;
}) {
  const router = useRouter();
  const { t } = useT();
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [body, setBody] = useState(existing?.body ?? "");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (rating < 1) return setErr(t("reviewForm.pickRating"));
    setBusy(true);
    try {
      const { error } = await createClient().rpc("submit_review", {
        p_reservation: reservationId,
        p_rating: rating,
        p_title: title.trim(),
        p_body: body.trim(),
      });
      if (error) throw error;
      setDone(true);
      router.refresh();
    } catch {
      setErr(t("reviewForm.errSend"));
    } finally {
      setBusy(false);
    }
  }

  if (done || existing?.status === "published") {
    return (
      <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-5">
        <p className="flex items-center gap-2 text-[14px] font-medium text-ink">
          <Check className="h-4 w-4 text-green-2" /> {t("reviewForm.thanks")}
        </p>
        <p className="mt-1 text-[13px] text-ink-3">
          {existing?.status === "published"
            ? t("reviewForm.published")
            : t("reviewForm.pendingReview")}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-[var(--radius-lg)] border border-line bg-bone p-5">
      <p className="text-[14px] font-medium text-ink">
        {existing ? t("reviewForm.edit") : t("reviewForm.give")}
      </p>
      <div className="mt-3 flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(i)}
            className="press p-0.5"
            aria-label={t("reviewForm.starsN", { n: i })}
          >
            <Star
              className={`h-6 w-6 ${
                i <= (hover || rating) ? "fill-brass text-brass" : "text-line"
              }`}
            />
          </button>
        ))}
      </div>
      <input
        className="field mt-3"
        placeholder={t("reviewForm.titlePlaceholder")}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <textarea
        className="field mt-2 min-h-[90px] resize-y"
        placeholder={t("reviewForm.bodyPlaceholder")}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      {err && <p className="mt-2 text-[12.5px] text-danger">{err}</p>}
      <button
        type="submit"
        disabled={busy}
        className="press mt-3 flex h-10 items-center justify-center gap-2 rounded-full bg-ink px-5 text-[13px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {t("reviewForm.send")}
      </button>
    </form>
  );
}
