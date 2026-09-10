import type { MetadataRoute } from "next";
import { getBranding } from "@/lib/cms";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const b = await getBranding();
  const name = b.wordmark?.trim() || "Les 2 Palmiers – Appartement de Rêve";
  const short = b.wordmark?.trim() || "Les 2 Palmiers";

  const icons: MetadataRoute.Manifest["icons"] = [
    { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
    { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ];

  return {
    name,
    short_name: short,
    description:
      "Appartement d'exception et conciergerie à Cotonou. Réservez, commandez, profitez.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f3ec",
    theme_color: "#14315b",
    lang: "fr",
    orientation: "portrait",
    icons,
  };
}
