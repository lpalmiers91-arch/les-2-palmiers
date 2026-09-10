import { ImageResponse } from "next/og";
import { getApartment } from "@/lib/apartments";
import { site } from "@/lib/site";
import { formatXOF } from "@/lib/format";

export const alt = "Appartement — Les 2 Palmiers";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const apt = await getApartment(slug).catch(() => null);
  const name = apt?.name ?? "Les 2 Palmiers";
  const cover = apt?.media?.[0]?.url ?? null;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#17130d", fontFamily: "sans-serif" }}>
        {cover && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" width={620} height={630} style={{ objectFit: "cover", height: "100%" }} />
        )}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: 64,
            color: "#f4f1ea",
          }}
        >
          <div style={{ fontSize: 26, letterSpacing: 5, textTransform: "uppercase", color: "#cc9c54" }}>
            {site.name}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ fontSize: 60, fontWeight: 700, lineHeight: 1.05 }}>{name}</div>
            {apt && (
              <div style={{ fontSize: 30, color: "#c9bfa6" }}>
                {apt.capacity} voyageurs · {apt.bedrooms} chambres · dès {formatXOF(apt.base_price)}/nuit
              </div>
            )}
          </div>
          <div style={{ fontSize: 24, color: "#c9bfa6" }}>{site.city}, {site.country}</div>
        </div>
      </div>
    ),
    size,
  );
}
