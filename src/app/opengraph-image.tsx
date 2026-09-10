import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { site } from "@/lib/site";

export const alt = "Les 2 Palmiers — Appartement de rêve & conciergerie à Cotonou";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function b64(p: string) {
  return "data:image/png;base64," + readFileSync(join(process.cwd(), p)).toString("base64");
}

export default function OgImage() {
  const wordmark = b64("public/brand/wordmark-light.png");
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#14315b",
          color: "#f6f3ec",
          padding: 80,
          fontFamily: "sans-serif",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={wordmark} alt="" height={72} style={{ objectFit: "contain", alignSelf: "flex-start" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ fontSize: 72, fontWeight: 700, lineHeight: 1.05, maxWidth: 940 }}>
            Profitez pleinement de votre temps.
          </div>
          <div style={{ fontSize: 38, color: "#cbc0a7" }}>Nous nous occupons du reste.</div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 26, color: "#cbc0a7" }}>
          <span>Appartement meublé d&apos;exception · Conciergerie</span>
          <span>
            {site.city}, {site.country}
          </span>
        </div>
      </div>
    ),
    size,
  );
}
