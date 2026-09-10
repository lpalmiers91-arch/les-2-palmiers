import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const alt = "Les 2 Palmiers — Appartement de rêve & conciergerie à Cotonou";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#1e3a2b",
          color: "#f4f1ea",
          padding: 80,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 30, letterSpacing: 6, textTransform: "uppercase" }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#cc9c54" }} />
          {site.name}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 74, fontWeight: 700, lineHeight: 1.05, maxWidth: 900 }}>
            Profitez pleinement de votre temps.
          </div>
          <div style={{ fontSize: 40, color: "#c9bfa6" }}>Nous nous occupons du reste.</div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 28, color: "#c9bfa6" }}>
          <span>Appartement meublé d&apos;exception · Conciergerie</span>
          <span>{site.city}, {site.country}</span>
        </div>
      </div>
    ),
    size,
  );
}
