import "server-only";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, isLocale, type Locale } from "./languages";
import { translate, translateList } from "./translate-client";

export const LOCALE_COOKIE = "NEXT_LOCALE";

/** Locale courante : cookie explicite, sinon en-tête Accept-Language, sinon défaut. */
export async function getLocale(): Promise<Locale> {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(c)) return c;

  const al = (await headers()).get("accept-language") ?? "";
  for (const part of al.split(",")) {
    const tag = part.split(";")[0]?.trim().slice(0, 2).toLowerCase();
    if (isLocale(tag)) return tag;
  }
  return DEFAULT_LOCALE;
}

type Messages = Record<string, unknown>;
const cache = new Map<Locale, Messages>();

export async function getMessages(locale: Locale): Promise<Messages> {
  const hit = cache.get(locale);
  if (hit) return hit;
  const mod = (await import(`./messages/${locale}.json`)).default as Messages;
  cache.set(locale, mod);
  return mod;
}

export { translate };

export async function getT() {
  const locale = await getLocale();
  const messages = await getMessages(locale);
  return {
    locale,
    messages,
    t: (key: string, vars?: Record<string, string | number>) => translate(messages, key, vars),
    tList: <T = unknown>(key: string): T[] => translateList<T>(messages, key),
  };
}
