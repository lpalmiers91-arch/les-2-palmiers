import { Star } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { createClient } from "@/lib/supabase/server";

type BlockContent = { title?: string; lede?: string };

export async function Reviews({ content }: { content?: BlockContent }) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select(
      "id, rating, title, body, staff_reply, created_at, client:profiles!reviews_client_id_fkey(full_name)",
    )
    .eq("status", "published")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(6);

  const reviews = data ?? [];
  if (reviews.length === 0) return null;

  const avg = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;

  return (
    <section id="avis" className="bg-bone-2">
      <div className="mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32">
        <Reveal className="max-w-xl">
          <div className="flex items-center gap-2">
            <span className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${i <= Math.round(avg) ? "fill-brass text-brass" : "text-line"}`}
                />
              ))}
            </span>
            <span className="tnum text-[13px] text-ink-3">
              {avg.toFixed(1)} · {reviews.length} avis
            </span>
          </div>
          <h2 className="display mt-4 text-[2.1rem] leading-[1.06] text-ink sm:text-[2.7rem]">
            {content?.title ?? "Ils ont séjourné ici."}
          </h2>
          {content?.lede && (
            <p className="measure mt-5 text-[1.02rem] leading-relaxed text-ink-2">{content.lede}</p>
          )}
        </Reveal>

        <Reveal className="mt-12 columns-1 gap-5 sm:columns-2 lg:columns-3">
          {reviews.map((r) => (
            <figure
              key={r.id}
              className="mb-5 break-inside-avoid rounded-[var(--radius-lg)] border border-line bg-bone p-5"
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
                {(r.client as { full_name?: string } | null)?.full_name ?? "Client"}
              </figcaption>
              {r.staff_reply && (
                <p className="mt-3 rounded-[10px] bg-bone-2 px-3 py-2 text-[12.5px] text-ink-2">
                  <span className="font-medium text-ink">Les 2 Palmiers : </span>
                  {r.staff_reply}
                </p>
              )}
            </figure>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
