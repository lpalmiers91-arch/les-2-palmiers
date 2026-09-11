// CORS + en-têtes de sécurité communs aux Edge Functions appelées depuis le
// navigateur (admin-invite, staff-booking, ai-assistant, ai-draft, ical-sync,
// notify, payment-checkout).
//
// SEC-01 : l'origine n'est plus "*" (qui autoriserait n'importe quel site à
// appeler ces fonctions au nom d'un admin/staff connecté — piégeage CORS).
// Elle est reflétée UNIQUEMENT si elle figure dans la liste blanche
// ALLOWED_ORIGINS (valeurs séparées par des virgules) ; sinon on retombe sur
// le domaine de marque par défaut, jamais sur l'origine de l'appelant.

// Domaine canonique réel du site (l'apex redirige vers www en 308) : c'est
// l'Origin que le navigateur envoie sur les appels légitimes en production.
const DEFAULT_ORIGIN = "https://www.les2palmiers.site";

function allowedOrigins(): string[] {
  const raw = Deno.env.get("ALLOWED_ORIGINS") ?? "";
  const list = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length > 0 ? list : [DEFAULT_ORIGIN];
}

/**
 * En-têtes CORS pour une requête donnée. `methods` ne doit lister que les
 * méthodes réellement supportées par la fonction (toutes les fonctions de ce
 * projet sont POST-only + OPTIONS pour le preflight).
 */
export function corsHeaders(req: Request, methods = "POST, OPTIONS"): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowed = allowedOrigins();
  const allowOrigin = allowed.includes(origin) ? origin : DEFAULT_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": methods,
    // la réponse varie selon Origin : ne jamais laisser un cache partagé la resservir telle quelle
    "Vary": "Origin",
  };
}

// SEC-10 : en-têtes de sécurité HTTP de base, à fusionner dans chaque réponse.
export const securityHeaders: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

export function preflight(req: Request, methods = "POST, OPTIONS"): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { ...corsHeaders(req, methods), ...securityHeaders } });
  }
  return null;
}
