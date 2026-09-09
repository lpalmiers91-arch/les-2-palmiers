"use client";

import { createContext, useCallback, useContext } from "react";
import { translate } from "./translate-client";
import type { Locale } from "./languages";

type Ctx = {
  locale: Locale;
  messages: Record<string, unknown>;
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({
  locale,
  messages,
  children,
}: Ctx & { children: React.ReactNode }) {
  return <I18nContext.Provider value={{ locale, messages }}>{children}</I18nContext.Provider>;
}

export function useT() {
  const ctx = useContext(I18nContext);
  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) =>
      ctx ? translate(ctx.messages, key, vars) : key,
    [ctx],
  );
  return { t, locale: ctx?.locale ?? "fr" };
}
