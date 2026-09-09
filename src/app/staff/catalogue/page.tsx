import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageTitle } from "@/components/app/ui";
import { ServiceIcon } from "@/components/marketing/service-icon";
import { CatalogueToggle } from "@/components/console/catalogue-toggle";
import { formatXOF } from "@/lib/format";

export const metadata: Metadata = { title: "Catalogue" };

export default async function CataloguePage() {
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select("id, title, description, icon, active, pricing_mode, base_price, lead_time_hours")
    .order("position");

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title="Catalogue de services" sub="Activer ou suspendre un service pour les clients." />
      <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-bone">
        {(services ?? []).map((s) => (
          <li key={s.id} className="flex items-center gap-4 px-5 py-4">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bone-2 text-forest-2">
              <ServiceIcon name={s.icon ?? "compass"} className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-ink">{s.title}</p>
              <p className="text-[12px] text-ink-3">
                {s.pricing_mode === "fixed" && s.base_price
                  ? formatXOF(s.base_price)
                  : s.pricing_mode === "metered"
                    ? "au réel"
                    : "sur devis"}{" "}
                · délai {s.lead_time_hours} h
              </p>
            </div>
            <CatalogueToggle id={s.id} active={s.active} />
          </li>
        ))}
      </ul>
    </div>
  );
}
