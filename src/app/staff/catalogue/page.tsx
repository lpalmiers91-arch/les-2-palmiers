import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageTitle } from "@/components/app/ui";
import { getT } from "@/lib/i18n";
import { ServiceCatalogueEditor } from "@/components/console/service-catalogue-editor";

export const metadata: Metadata = { title: "Catalogue" };

export default async function CataloguePage() {
  const { t } = await getT();
  const supabase = await createClient();
  const { data: services } = await supabase
    .from("services")
    .select(
      "id, title, description, icon, active, pricing_mode, base_price, unit, lead_time_hours",
    )
    .order("position");

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title={t("console.title.catalogue")} sub={t("console.sub.catalogue")} />
      <ServiceCatalogueEditor services={services ?? []} />
    </div>
  );
}
