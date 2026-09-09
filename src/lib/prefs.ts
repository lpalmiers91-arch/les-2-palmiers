"use client";

/**
 * Stockage de préférences client robuste : cookie (survit à un localStorage
 * bridé — Safari privé, iOS, quotas) + localStorage + repli mémoire.
 * Une valeur écrite reste écrite : les bannières/popups ne réapparaissent pas.
 */

const mem = new Map<string, string>();
const YEAR = 60 * 60 * 24 * 365;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[1]) : null;
}

export function getPref(key: string): string | null {
  const ck = `l2p_${key}`;
  const fromCookie = readCookie(ck);
  if (fromCookie != null) return fromCookie;
  try {
    const v = localStorage.getItem(`l2p-${key}`);
    if (v != null) return v;
  } catch {
    /* ignore */
  }
  return mem.get(key) ?? null;
}

export function setPref(key: string, value: string): void {
  mem.set(key, value);
  const ck = `l2p_${key}`;
  try {
    document.cookie = `${ck}=${encodeURIComponent(value)}; path=/; max-age=${YEAR}; samesite=lax`;
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(`l2p-${key}`, value);
  } catch {
    /* ignore */
  }
}

export function getJSON<T>(key: string): T | null {
  const raw = getPref(key);
  if (raw == null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setJSON(key: string, value: unknown): void {
  setPref(key, JSON.stringify(value));
}

/** Décision de consentement cookies prise ? (compat ancienne clé incluse) */
export function consentDecided(): boolean {
  if (getPref("consent") != null) return true;
  // ancienne clé
  if (readCookie("l2p_consent") != null) return true;
  try {
    if (localStorage.getItem("l2p-consent-v1") != null) return true;
  } catch {
    /* ignore */
  }
  return false;
}
