import type { Metadata } from "next";
import { Services } from "@/components/marketing/services";
import { Concierge } from "@/components/marketing/concierge";
import { Closing } from "@/components/marketing/closing";
import { getHomeBlock } from "@/lib/cms";

export const metadata: Metadata = {
  title: "Services & conciergerie",
  description:
    "Voiture, ménage, cuisinier, bien-être, tourisme — la conciergerie des 2 Palmiers apporte tout à la porte de l'appartement.",
};

export default async function ServicesPage() {
  const [concierge, services, closing] = await Promise.all([
    getHomeBlock("concierge"),
    getHomeBlock("services"),
    getHomeBlock("closing"),
  ]);

  return (
    <div className="pt-[64px]">
      <Concierge content={concierge} />
      <Services content={services} />
      <Closing content={closing} />
    </div>
  );
}
