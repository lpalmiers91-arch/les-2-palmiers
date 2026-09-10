"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { getPref, setPref } from "@/lib/prefs";
import { type Rates, formatMoney, isCurrency } from "@/lib/money";

type Ctx = {
  currency: string;
  setCurrency: (c: string) => void;
  rates: Rates;
  enabled: boolean;
  price: (amountXof: number | null | undefined) => string;
};

const CurrencyContext = createContext<Ctx | null>(null);
const KEY = "currency";

export function CurrencyProvider({
  rates,
  enabled,
  initial = "XOF",
  children,
}: {
  rates: Rates;
  enabled: boolean;
  initial?: string;
  children: React.ReactNode;
}) {
  const [currency, setCur] = useState(initial);

  useEffect(() => {
    if (!enabled) return;
    // devise détectée automatiquement (pays) ; une préférence explicite reste prioritaire
    const saved = getPref(KEY);
    if (isCurrency(saved)) setCur(saved);
    else if (isCurrency(initial)) setCur(initial);
  }, [enabled, initial]);

  const setCurrency = useCallback((c: string) => {
    setCur(c);
    try {
      setPref(KEY, c);
    } catch {
      /* stockage indisponible */
    }
  }, []);

  const price = useCallback(
    (amountXof: number | null | undefined) =>
      amountXof == null ? "—" : formatMoney(amountXof, enabled ? currency : "XOF", rates),
    [currency, rates, enabled],
  );

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, rates, enabled, price }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): Ctx {
  const ctx = useContext(CurrencyContext);
  if (ctx) return ctx;
  // hors provider : repli XOF
  return {
    currency: "XOF",
    setCurrency: () => {},
    rates: {},
    enabled: false,
    price: (n) => (n == null ? "—" : new Intl.NumberFormat("fr-FR").format(Math.round(n)) + " XOF"),
  };
}

/** Prix converti selon la devise choisie. À utiliser dans un composant serveur ou client. */
export function Price({
  xof,
  className,
  approx = false,
}: {
  xof: number | null | undefined;
  className?: string;
  approx?: boolean;
}) {
  const { price, currency, enabled } = useCurrency();
  const showApprox = approx && enabled && currency !== "XOF";
  return (
    <span className={className}>
      {showApprox ? "≈ " : ""}
      {price(xof)}
    </span>
  );
}
