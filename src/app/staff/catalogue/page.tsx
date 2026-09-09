import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageTitle } from "@/components/app/ui";
import { ServiceCatalogueEditor } from "@/components/console/service-catalogue-editor";

export const metadata: Metadata = { title: "Catalogue" };

export default async function CataloguePage() {
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select(
      "id, title, description, icon, active, pricing_mode, base_price, unit, lead_time_hours",
    )
    .order("position");

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle
        title="Catalogue de services"
        sub="Modifier le descriptif, le prix, la disponibilité et le délai de chaque prestation."
      />
      <ServiceCatalogueEditor services={services ?? []} />
    </div>
  );
}
