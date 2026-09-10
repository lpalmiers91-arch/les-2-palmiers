import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { Services } from "@/components/marketing/services";
import { Concierge } from "@/components/marketing/concierge";
import { Closing } from "@/components/marketing/closing";
import { getHomeBlock } from "@/lib/cms";


export async function generateMetadata(): Promise<Metadata> {
  return pageMeta("/services", {
    title: "Services à domicile — Les 2 Palmiers",
    description: "Voiture avec chauffeur, ménage, cuisinier, coiffure, massage, garde d'enfants… commandez à la demande pendant votre séjour à Cotonou.",
  });
}

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
