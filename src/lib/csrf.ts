// SEC-08 — Garde CSRF légère pour les routes API POST publiques.
//
// Next.js n'a pas de protection CSRF native sur les Route Handlers. Pour des
// routes appelées uniquement par le JS first-party du site (formulaire de
// contact, suivi analytics), on applique la vérification recommandée par
// l'OWASP ("Verifying Origin With Standard Headers") : l'en-tête `Origin`
// (ou `Referer` en repli) doit pointer vers le MÊME hôte que la requête.
// Aucune configuration de domaine à maintenir : ça fonctionne identiquement
// en dev, preview et prod, quel que soit le domaine.
export function isSameOriginRequest(req: Request): boolean {
  const host = req.headers.get("host");
  if (!host) return false;

  const origin = req.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }

  // Repli Referer : rare pour un fetch() POST moderne (Origin est presque
  // toujours présent), mais certains clients/proxys l'omettent.
  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }

  // Ni Origin ni Referer : on refuse (posture stricte anti-CSRF).
  return false;
}
