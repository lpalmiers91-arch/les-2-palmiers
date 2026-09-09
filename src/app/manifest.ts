import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Les 2 Palmiers – Appartement de Rêve",
    short_name: "Les 2 Palmiers",
    description:
      "Appartement d'exception et conciergerie à Cotonou. Réservez, commandez, profitez.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f1ea",
    theme_color: "#1e3a2b",
    lang: "fr",
    orientation: "portrait",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png", purpose: "maskable" },
    ],
  };
}
