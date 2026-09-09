// Données de repli du site (utilisées si Supabase ne répond pas).
// Source de vérité = Supabase (tables apartments / services / destinations).

export const site = {
  name: "Les 2 Palmiers",
  legalName: "Les 2 Palmiers – Appartement de Rêve",
  tagline: "Profitez pleinement de votre temps.",
  taglineEnd: "Nous nous occupons du reste.",
  city: "Cotonou",
  country: "Bénin",
  domain: "les2palmiers.site",
  url: "https://les2palmiers.site",
  email: "bonjour@les2palmiers.site",
  phones: ["+229 01 64 65 63 63", "+229 01 40 69 55 34"],
} as const;

export const apartmentFallback = {
  slug: "les-2-palmiers",
  name: "Les 2 Palmiers – Appartement de Rêve",
  summary:
    "Un appartement meublé d'exception à Cotonou : Wi-Fi fibre, parking privé, cuisine équipée, climatisation, salon détente et gardiennage permanent.",
  capacity: 4,
  bedrooms: 2,
  bathrooms: 2,
  base_price: 45000,
  cleaning_fee: 15000,
  currency: "XOF",
  checkin_from: "14:00",
  checkout_before: "11:00",
  cancellation_policy: "moderate" as const,
};

export const amenitiesFallback = [
  { key: "wifi", label: "Wi-Fi fibre", detail: "Débit adapté au télétravail" },
  { key: "parking", label: "Parking privé", detail: "Place sécurisée" },
  { key: "kitchen", label: "Cuisine équipée", detail: "Tout l'électroménager" },
  { key: "ac", label: "Climatisation", detail: "Dans chaque pièce" },
  { key: "lounge", label: "Salon détente", detail: "Espace de vie ouvert" },
  { key: "water", label: "Eau & secours", detail: "Réserve + groupe électrogène" },
  { key: "security", label: "Gardiennage", detail: "24 h / 24" },
];

export type ServiceFallback = {
  slug: string;
  title: string;
  description: string;
  icon: string;
  pricing_mode: "fixed" | "quote" | "metered";
  base_price: number | null;
  unit: string;
};

export const servicesFallback: ServiceFallback[] = [
  { slug: "location-voiture", title: "Location de voiture", description: "Des véhicules modernes, avec ou sans chauffeur, pour tous vos déplacements.", icon: "car", pricing_mode: "quote", base_price: null, unit: "jour" },
  { slug: "entretien", title: "Ménage & entretien", description: "Des professionnels qualifiés pour la propreté et l'ordre de votre appartement.", icon: "sparkles", pricing_mode: "fixed", base_price: 15000, unit: "prestation" },
  { slug: "coiffure-tresses", title: "Coiffure & tresses", description: "Coiffeurs et coiffeuses professionnels se déplacent chez vous.", icon: "scissors", pricing_mode: "quote", base_price: null, unit: "prestation" },
  { slug: "cuisinier", title: "Cuisinier à domicile", description: "Des plats faits maison, préparés selon vos goûts et vos envies.", icon: "chef-hat", pricing_mode: "quote", base_price: null, unit: "prestation" },
  { slug: "pedicure-manucure", title: "Pédicure & manucure", description: "Soins professionnels pour des mains et des pieds impeccables.", icon: "hand", pricing_mode: "fixed", base_price: 10000, unit: "prestation" },
  { slug: "massage", title: "Massage à domicile", description: "Des mains expertes pour votre bien-être et votre relaxation.", icon: "waves", pricing_mode: "fixed", base_price: 15000, unit: "prestation" },
  { slug: "recharge-transactions", title: "Recharge & transactions", description: "Recharge MTN, Moov et Celtis, et transactions rapides.", icon: "wallet", pricing_mode: "metered", base_price: null, unit: "prestation" },
  { slug: "couture", title: "Couture à domicile", description: "Des tailleurs professionnels à votre service, où que vous soyez.", icon: "shirt", pricing_mode: "quote", base_price: null, unit: "prestation" },
  { slug: "garde-enfants", title: "Garde d'enfants", description: "Des nounous professionnelles, fiables et disponibles.", icon: "baby", pricing_mode: "metered", base_price: null, unit: "heure" },
  { slug: "sur-mesure", title: "Sur mesure", description: "Un besoin particulier ? Nous adaptons nos services à votre demande.", icon: "compass", pricing_mode: "quote", base_price: null, unit: "prestation" },
];

export const destinationsFallback = [
  { name: "Ouidah", tag: "Mémoire & patrimoine" },
  { name: "Abomey", tag: "Palais royaux" },
  { name: "Lac Noir", tag: "Eaux paisibles" },
  { name: "Agouland", tag: "Nature préservée" },
  { name: "Kpalimé", tag: "Collines verdoyantes" },
  { name: "Lomé", tag: "Vie côtière" },
];

export function formatXOF(n: number): string {
  return new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " XOF";
}

/** URL publique d'une photo de l'appartement (bucket Storage `apartment-media`). */
export function aptImg(name: string): string {
  const base =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zmobadwgoqcwkryefciq.supabase.co";
  return `${base}/storage/v1/object/public/apartment-media/${name}`;
}
