import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageTitle } from "@/components/app/ui";
import { ReviewModeration, type ReviewRow } from "@/components/console/review-moderation";

export const metadata: Metadata = { title: "Avis clients" };

export default async function StaffReviews() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("reviews")
    .select(
      "id, rating, title, body, status, featured, staff_reply, created_at, client:profiles!reviews_client_id_fkey(full_name), apartment:apartments(name)",
    )
    .order("created_at", { ascending: false });

  const rows: ReviewRow[] = (data ?? []).map((r) => ({
    id: r.id,
    rating: r.rating,
    title: r.title,
    body: r.body,
    status: r.status,
    featured: r.featured,
    staff_reply: r.staff_reply,
    created_at: r.created_at as string,
    client_name: (r.client as { full_name?: string } | null)?.full_name ?? null,
    apartment_name: (r.apartment as { name?: string } | null)?.name ?? null,
  }));

  const pending = rows.filter((r) => r.status === "pending").length;

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle
        title="Avis clients"
        sub={
          pending > 0
            ? `${pending} avis en attente de modération.`
            : "Publiez, masquez, mettez en avant et répondez aux avis."
        }
      />
      <ReviewModeration rows={rows} />
    </div>
  );
}
