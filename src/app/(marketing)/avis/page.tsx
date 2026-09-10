import type { Metadata } from "next";
import { Star } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { pageMeta } from "@/lib/seo";
import { getT } from "@/lib/i18n";
import { site } from "@/lib/site";
import { JsonLd } from "@/components/seo/json-ld";

export async function generateMetadata(): Promise<Metadata> {
  return pageMeta("/avis", {
    title: "Avis clients — Les 2 Palmiers",
    description:
      "Ce que disent les voyageurs après leur séjour aux 2 Palmiers, appartements meublés et conciergerie à Cotonou.",
  });
}

export default async function ReviewsPage() {
  const { t } = await getT();
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select(
      "id, rating, title, body, staff_reply, created_at, author_name, client:profiles!reviews_client_id_fkey(full_name), apartment:apartments(name)",
    )
    .eq("status", "published")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });

  const reviews = data ?? [];
  const avg =
    reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;

  return (
    <div className="bg-bone">
      {reviews.length > 0 && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "AggregateRating",
            itemReviewed: { "@type": "LodgingBusiness", name: site.legalName },
            ratingValue: Math.round(avg * 10) / 10,
            reviewCount: reviews.length,
            bestRating: 5,
          }}
        />
      )}
      <div className="mx-auto max-w-5xl px-5 pb-24 pt-[104px] md:px-8 md:pt-[132px]">
        <header className="max-w-xl">
          <p className="text-[13px] font-medium tracking-tight text-forest-2">{t("nav.reviews")}</p>
          <h1 className="display mt-3 text-[2.4rem] leading-[1.05] text-ink md:text-[3rem]">
            {t("home.reviewsTitle")}
          </h1>
          <p className="measure mt-5 text-[1.05rem] leading-relaxed text-ink-2">
            {t("home.reviewsLede")}
          </p>
          {reviews.length > 0 && (
            <div className="mt-5 flex items-center gap-2">
              <span className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${i <= Math.round(avg) ? "fill-brass text-brass" : "text-line"}`}
                  />
                ))}
              </span>
              <span className="tnum text-[13px] text-ink-3">
                {avg.toFixed(1)} · {t("home.reviewsCount", { n: reviews.length })}
              </span>
            </div>
          )}
        </header>

        {reviews.length === 0 ? (
          <p className="mt-12 rounded-[var(--radius-lg)] border border-line bg-bone p-10 text-center text-[14px] text-ink-3">
            {t("avisPage.empty")}
          </p>
        ) : (
          <div className="mt-12 columns-1 gap-5 sm:columns-2 lg:columns-3">
            {reviews.map((r) => (
              <figure
                key={r.id}
                className="mb-5 break-inside-avoid rounded-[var(--radius-lg)] border border-line bg-bone-2 p-5"
              >
                <span className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className={`h-3.5 w-3.5 ${i <= r.rating ? "fill-brass text-brass" : "text-line"}`}
                    />
                  ))}
                </span>
                {r.title && <p className="mt-3 text-[14px] font-medium text-ink">{r.title}</p>}
                <blockquote className="mt-1.5 whitespace-pre-wrap text-[13.5px] leading-relaxed text-ink-2">
                  {r.body}
                </blockquote>
                <figcaption className="mt-3 text-[12px] text-ink-3">
                  {r.author_name ?? (r.client as { full_name?: string } | null)?.full_name ?? t("home.guestFallback")}
                  {(r.apartment as { name?: string } | null)?.name
                    ? ` · ${(r.apartment as { name?: string }).name}`
                    : ""}
                </figcaption>
                {r.staff_reply && (
                  <p className="mt-3 rounded-[10px] bg-bone px-3 py-2 text-[12.5px] text-ink-2">
                    <span className="font-medium text-ink">{t("home.reviewsReplyLabel")}</span>
                    {r.staff_reply}
                  </p>
                )}
              </figure>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
