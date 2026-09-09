import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ServiceOrderForm } from "@/components/app/service-order-form";
import { formatDate, parseRange } from "@/lib/format";

export default async function ServiceDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: service } = await supabase
    .from("services")
    .select("id, slug, title, description, pricing_mode, base_price, lead_time_hours, options_schema")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (!service) notFound();

  const { data: res } = await supabase
    .from("reservations")
    .select("id, reference, date_range")
    .in("status", ["pending_payment", "confirmed", "in_stay"])
    .order("created_at", { ascending: false });

  const reservations = (res ?? []).map((r) => {
    const { start, end } = parseRange(r.date_range as string);
    return {
      id: r.id as string,
      label: `${formatDate(start, { day: "numeric", month: "short" })} — ${formatDate(end, { day: "numeric", month: "short" })} · ${r.reference}`,
    };
  });

  return (
    <div className="mx-auto max-w-xl">
      <Link
        href="/app/services"
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Tous les services
      </Link>
      <div className="mt-5">
        <ServiceOrderForm service={service} reservations={reservations} />
      </div>
    </div>
  );
}
