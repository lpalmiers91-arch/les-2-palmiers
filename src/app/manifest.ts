import type { MetadataRoute } from "next";
import { getBranding } from "@/lib/cms";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const b = await getBranding();
  const name = b.wordmark?.trim() || "Les 2 Palmiers – Appartement de Rêve";
  const short = b.wordmark?.trim() || "Les 2 Palmiers";

  const icons: MetadataRoute.Manifest["icons"] = b.logo_url
    ? [
        { src: b.logo_url, sizes: "any", type: "image/png", purpose: "any" },
        { src: b.logo_url, sizes: "512x512", type: "image/png", purpose: "maskable" },
      ]
    : [
        { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        { src: "/apple-icon", sizes: "180x180", type: "image/png", purpose: "maskable" },
      ];

  return {
    name,
    short_name: short,
    description:
      "Appartement d'exception et conciergerie à Cotonou. Réservez, commandez, profitez.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f1ea",
    theme_color: "#1e3a2b",
    lang: "fr",
    orientation: "portrait",
    icons,
  };
}
