import { site } from "@/lib/site";

/** Injecte un bloc JSON-LD. `data` doit être sérialisable. */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // VULN-11 : neutralise toute tentative de fermeture de balise <script>
      // via un champ dérivé de contenu éditable (nom d'appartement, etc.).
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  );
}

export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: site.legalName,
    url: site.url,
    email: site.email,
    telephone: site.phones[0],
    address: {
      "@type": "PostalAddress",
      addressLocality: site.city,
      addressCountry: "BJ",
    },
    areaServed: site.city,
    priceRange: "$$",
    image: `${site.url}/opengraph-image`,
  };
}

export function apartmentLd(apt: {
  slug: string;
  name: string;
  summary: string | null;
  base_price: number;
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  media?: { url: string }[];
  rating?: { value: number; count: number } | null;
}) {
  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Apartment",
    name: apt.name,
    description: apt.summary ?? undefined,
    url: `${site.url}/appartements/${apt.slug}`,
    numberOfRooms: apt.bedrooms,
    occupancy: { "@type": "QuantitativeValue", maxValue: apt.capacity },
    numberOfBathroomsTotal: apt.bathrooms,
    image: apt.media?.slice(0, 5).map((m) => m.url),
    offers: {
      "@type": "Offer",
      price: apt.base_price,
      priceCurrency: "XOF",
      availability: "https://schema.org/InStock",
      url: `${site.url}/appartements/${apt.slug}`,
    },
  };
  if (apt.rating && apt.rating.count > 0) {
    data.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: apt.rating.value,
      reviewCount: apt.rating.count,
      bestRating: 5,
    };
  }
  return data;
}

export function breadcrumbLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.url,
    })),
  };
}
