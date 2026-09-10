"use client";

import { getPref, setPref, getJSON } from "@/lib/prefs";

type Consent = { analytics?: boolean };

function analyticsAllowed(): boolean {
  return getJSON<Consent>("consent")?.analytics === true;
}

function sessionId(): string {
  let sid = getPref("sid");
  if (!sid) {
    sid = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)) + Date.now().toString(36);
    setPref("sid", sid);
  }
  return sid;
}

function utm(): Record<string, string> {
  try {
    const p = new URLSearchParams(window.location.search);
    const out: Record<string, string> = {};
    for (const k of ["source", "medium", "campaign"]) {
      const v = p.get("utm_" + k);
      if (v) out[k] = v;
    }
    // mémorise la première source pour la durée de la session
    if (Object.keys(out).length) setPref("utm", JSON.stringify(out));
    return out.source ? out : getJSON<Record<string, string>>("utm") ?? {};
  } catch {
    return {};
  }
}

/** Enregistre un évènement (silencieux si pas de consentement analytics). */
export async function track(
  event: string,
  meta: Record<string, unknown> = {},
  path?: string,
): Promise<void> {
  if (!analyticsAllowed()) return;
  const payload = JSON.stringify({
    session: sessionId(),
    event,
    path: path ?? window.location.pathname,
    referrer: document.referrer || undefined,
    utm: utm(),
    meta,
    ua: navigator.userAgent.slice(0, 300),
  });
  try {
    // sendBeacon survit à la fermeture d'onglet (utile pour page_leave)
    if (navigator.sendBeacon && event === "page_leave") {
      navigator.sendBeacon("/api/track", new Blob([payload], { type: "application/json" }));
      return;
    }
    await fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    });
  } catch {
    /* jamais bloquant */
  }
}
