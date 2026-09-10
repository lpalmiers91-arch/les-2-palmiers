import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageTitle, StatusBadge } from "@/components/app/ui";
import { ServiceIcon } from "@/components/marketing/service-icon";
import { formatXOF, formatDate } from "@/lib/format";
import { getT } from "@/lib/i18n";

export const metadata: Metadata = { title: "Services" };

export default async function ServicesPage() {
  const { t } = await getT();
  const supabase = await createClient();

  const [{ data: services }, { data: orders }] = await Promise.all([
    supabase
      .from("services")
      .select("id, slug, title, description, pricing_mode, base_price, icon")
      .eq("active", true)
      .order("position"),
    supabase
      .from("service_orders")
      .select("id, reference, status, scheduled_for, price, service:services(title)")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title={t("appServices.title")} sub={t("appServices.sub")} />

      {orders && orders.length > 0 && (
        <section className="mb-9">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
            {t("appServices.yourRequests")}
          </h2>
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-bone">
            {orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div>
                  <p className="text-[14px] text-ink">
                    {(o.service as { title?: string } | null)?.title ?? t("appServices.service")}
                  </p>
                  <p className="text-[12px] text-ink-3">
                    {o.scheduled_for ? formatDate(o.scheduled_for) : t("appServices.slotTbd")}
                    {o.price ? ` · ${formatXOF(o.price)}` : ""}
                  </p>
                </div>
                <StatusBadge status={o.status} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
        {t("appServices.catalog")}
      </h2>
      <ul className="mt-3 divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-bone">
        {(services ?? []).map((s) => (
          <li key={s.id}>
            <Link
              href={`/app/services/${s.slug}`}
              className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-ink/[0.025]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bone-2 text-forest-2">
                <ServiceIcon name={s.icon ?? "compass"} className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14.5px] font-medium text-ink">{s.title}</span>
                <span className="block truncate text-[12.5px] text-ink-3">{s.description}</span>
              </span>
              <span className="whitespace-nowrap text-[12px] font-medium text-ink-2">
                {s.pricing_mode === "fixed" && s.base_price
                  ? formatXOF(s.base_price)
                  : s.pricing_mode === "metered"
                    ? t("appServices.metered")
                    : t("appServices.quote")}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-ink-3" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
