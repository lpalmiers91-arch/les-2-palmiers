import "server-only";
import { headers } from "next/headers";

const EUR = new Set([
  "FR", "BE", "LU", "DE", "IT", "ES", "PT", "NL", "AT", "IE", "FI", "GR", "SK", "SI",
  "EE", "LV", "LT", "CY", "MT", "HR", "MC",
]);

/** Pays du visiteur (en-tête Vercel/CDN), ou null. */
export async function visitorCountry(): Promise<string | null> {
  const h = await headers();
  const c =
    h.get("x-vercel-ip-country") ||
    h.get("x-country") ||
    h.get("cf-ipcountry") ||
    null;
  return c ? c.toUpperCase() : null;
}

/** Devise d'affichage déduite du pays. Repli : XOF (Bénin / zone franc). */
export async function autoCurrency(): Promise<string> {
  const c = await visitorCountry();
  if (!c) return "XOF";
  if (EUR.has(c)) return "EUR";
  if (c === "US") return "USD";
  if (c === "GB") return "GBP";
  if (c === "CA") return "CAD";
  if (c === "CH") return "EUR";
  return "XOF";
}
