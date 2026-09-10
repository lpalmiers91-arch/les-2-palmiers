// Conversion d'affichage. Le débit reste toujours en XOF.

export type Rates = Record<string, number>; // XOF pour 1 unité de la devise

export const CURRENCIES: { code: string; symbol: string; label: string }[] = [
  { code: "XOF", symbol: "FCFA", label: "Franc CFA" },
  { code: "EUR", symbol: "€", label: "Euro" },
  { code: "USD", symbol: "$", label: "Dollar US" },
  { code: "GBP", symbol: "£", label: "Livre sterling" },
  { code: "CAD", symbol: "$ CA", label: "Dollar canadien" },
];

export function isCurrency(c: string | undefined | null): c is string {
  return !!c && CURRENCIES.some((x) => x.code === c);
}

export function convertFromXof(amountXof: number, currency: string, rates: Rates): number {
  if (currency === "XOF") return amountXof;
  const rate = rates[currency];
  if (!rate || rate <= 0) return amountXof;
  return amountXof / rate;
}

/** Format déterministe (locale fixe fr-FR) — pas de décalage d'hydratation. */
export function formatMoney(amountXof: number, currency: string, rates: Rates): string {
  if (currency === "XOF" || !rates[currency]) {
    return new Intl.NumberFormat("fr-FR").format(Math.round(amountXof)) + " XOF";
  }
  const v = convertFromXof(amountXof, currency, rates);
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency,
    maximumFractionDigits: v >= 100 ? 0 : 2,
  }).format(v);
}
