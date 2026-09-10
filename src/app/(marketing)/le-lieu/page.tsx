import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { Tourism } from "@/components/marketing/tourism";
import { Closing } from "@/components/marketing/closing";
import { getHomeBlock } from "@/lib/cms";


export async function generateMetadata(): Promise<Metadata> {
  return pageMeta("/le-lieu", {
    title: "Le lieu — Cotonou & alentours",
    description: "Séjournez à Cotonou, explorez la côte, les palais royaux, les lagunes et les collines. On organise la voiture et le programme.",
  });
}

export default async function PlacePage() {
  const [tourism, closing] = await Promise.all([
    getHomeBlock("tourism"),
    getHomeBlock("closing"),
  ]);

  return (
    <div className="pt-[64px]">
      <Tourism content={tourism} />
      <Closing content={closing} />
    </div>
  );
}
