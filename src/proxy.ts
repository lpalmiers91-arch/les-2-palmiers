import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// SEC-03 — CSP stricte avec nonce par requête.
//
// Générée ICI (pas dans next.config.ts) car un nonce doit être unique par
// requête ; next.config.ts ne produit qu'un en-tête statique. Next.js lit le
// nonce dans l'en-tête Content-Security-Policy de la REQUÊTE transmise au
// rendu et l'applique automatiquement à ses propres scripts (bootstrap,
// chunks, React) — voir docs/01-app/02-guides/content-security-policy.md.
// Toutes les routes de ce projet sont déjà en rendu dynamique (session
// Supabase lue partout), donc le passage au nonce n'a aucun coût de
// static-generation ici (pas de régression de perf/caching à attendre).
const supabaseHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host
  : "zmobadwgoqcwkryefciq.supabase.co";

function buildCsp(nonce: string, isDev: boolean): string {
  return [
    `default-src 'self'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'self'`,
    `object-src 'none'`,
    // 'strict-dynamic' fait ignorer 'self' par les navigateurs qui le supportent ;
    // seuls les scripts nonce'és (et ceux qu'ils chargent) peuvent s'exécuter.
    // 'unsafe-eval' uniquement en dev (HMR / stack traces React) — jamais en prod.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    // style-src garde 'unsafe-inline' (styles générés par Next / CSS-in-JS) :
    // pas de nonce ici, sinon les navigateurs ignoreraient 'unsafe-inline'.
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com data:`,
    `img-src 'self' data: blob: https://${supabaseHost}`,
    `media-src 'self' https://${supabaseHost}`,
    `connect-src 'self' https://${supabaseHost} wss://${supabaseHost}`,
    `worker-src 'self' blob:`,
    `manifest-src 'self'`,
    `upgrade-insecure-requests`,
  ].join("; ");
}

// Next 16 : "proxy" (ex-middleware) tourne sur le runtime Node.js.
export async function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV === "development";
  const csp = buildCsp(nonce, isDev);

  // en-têtes enrichis transmis au rendu : Next y lit le nonce pour ses propres scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = await updateSession(request, requestHeaders);
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  // tout sauf les assets statiques, les fichiers Next et les fichiers avec extension
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.[\\w]+$).*)"],
};
