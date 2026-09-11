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
// Pas de repli en dur sur le projet Supabase réel : une variable manquante
// doit faire échouer bruyamment, pas connecter silencieusement l'app à un
// backend de production (voir src/lib/supabase/config.ts, même règle).
if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) {
  throw new Error("[proxy] variable d'environnement manquante : NEXT_PUBLIC_SUPABASE_URL");
}
const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).host;

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
    // style-src-elem / style-src-attr séparés (correction post-CORRECTIF 3) :
    // un nonce authentifie des balises <style nonce="…"> (style-src-elem),
    // JAMAIS un attribut style="" (style-src-attr) — un attribut n'a pas
    // d'emplacement pour porter un nonce, seul 'unsafe-inline' (ou un hash
    // par valeur exacte, impraticable ici) peut l'autoriser. Un style-src
    // nonce-only, sans cette distinction, bloque donc TOUT attribut style=""
    // posé par du code applicatif normal (next/image `fill`, Motion, tout
    // `style={{...}}` React) — constaté en direct : next/image ne dimensionne
    // plus rien (position:absolute/width/height ignorés par le navigateur,
    // erreurs console "Applying inline style violates... style-src").
    // Les balises <style> (celle de src/app/layout.tsx, celles générées par
    // Next) restent donc protégées par le nonce ; les attributs style=""
    // (très répandus, non contrôlables par un attaquant sans XSS préalable
    // ailleurs — à ce stade `script-src` nonce+strict-dynamic est déjà le
    // vrai rempart) restent autorisés.
    `style-src-elem 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    `style-src-attr 'unsafe-inline'`,
    // repli pour les navigateurs ne comprenant pas style-src-elem/-attr
    // (ils retombent alors sur style-src pour les deux usages) : au moins
    // aussi permissif que style-src-attr, pour ne rien casser chez eux.
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
