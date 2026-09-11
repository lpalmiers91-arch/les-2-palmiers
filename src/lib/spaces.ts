// Cloisonnement client / équipe.
//
// Deux espaces totalement séparés :
//  - CLIENT : site public, réservation, /connexion, /inscription, /app/*
//  - ÉQUIPE : /equipe (connexion dédiée), /staff/*, /admin/*
//
// Mode "hôtes séparés" (recommandé en production) : définir STAFF_HOST
// (ex. admin.les2palmiers.site). L'espace équipe n'est alors accessible QUE
// sur cet hôte, l'espace client QUE sur l'hôte principal — les routes de
// l'autre espace renvoient une redirection vers le bon hôte.
//
// Mode "hôte unique" (aperçu Vercel) : STAFF_HOST non défini. Les deux arbres
// de routes coexistent mais les gardes de rôle + les pages de connexion
// distinctes garantissent l'isolation logique.

export type Audience = "client" | "team";
export type Space = "client-app" | "client-auth" | "client-public" | "team" | "team-auth" | "shared";

const TEAM_ROLES = new Set(["admin", "staff", "coordinator"]);

export function audienceFromRoles(roles: readonly string[] | null | undefined): Audience {
  return (roles ?? []).some((r) => TEAM_ROLES.has(r)) ? "team" : "client";
}

export function classify(pathname: string): Space {
  if (pathname === "/staff" || pathname.startsWith("/staff/")) return "team";
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return "team";
  if (pathname === "/equipe" || pathname.startsWith("/equipe/")) return "team-auth";
  if (pathname === "/app" || pathname.startsWith("/app/")) return "client-app";
  if (pathname === "/connexion" || pathname === "/inscription" || pathname === "/mot-de-passe")
    return "client-auth";
  if (pathname === "/" || pathname === "/reserver" || pathname.startsWith("/legal/"))
    return "client-public";
  return "shared"; // /auth/*, /recu/*, /contrat/*, assets…
}

// Caractères de contrôle (0x00–0x1F), espace (0x20) et DEL (0x7F) : interdits
// dans une destination de redirection (évite le smuggling d'en-tête / le bypass).
const CTRL_OR_SPACE = new RegExp("[\\x00-\\x20\\x7f]");

/**
 * Assainit une destination de redirection interne (paramètre `suite`, `next`, …).
 * Empêche l'open redirect (VULN-05) : on n'accepte qu'un chemin absolu du site.
 *  - doit commencer par "/"
 *  - PAS "//" ni "/\" (URL protocole-relative)
 *  - aucun "://", "\" ni caractère de contrôle
 */
export function sanitizeInternalRedirect(
  dest: string | null | undefined,
  fallback = "/app",
): string {
  if (typeof dest !== "string") return fallback;
  const d = dest.trim();
  if (d.length === 0 || d.length > 512) return fallback;
  if (!d.startsWith("/")) return fallback;
  if (d.startsWith("//") || d.startsWith("/\\")) return fallback;
  const low = d.toLowerCase();
  if (low.startsWith("/%2f") || low.startsWith("/%5c") || low.startsWith("/%09")) return fallback;
  if (d.includes("://") || d.includes("\\") || CTRL_OR_SPACE.test(d)) return fallback;
  return d;
}

/** Où envoyer un utilisateur connecté qui arrive sur une page de connexion / racine. */
export function homeFor(audience: Audience, roles: readonly string[] | null | undefined): string {
  if (audience === "team") {
    return (roles ?? []).includes("admin") ? "/admin" : "/staff";
  }
  return "/app";
}

export const STAFF_HOST = process.env.STAFF_HOST?.trim() || "";
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN?.trim() || "";
export const STAFF_ORIGIN =
  process.env.STAFF_ORIGIN?.trim() || (STAFF_HOST ? `https://${STAFF_HOST}` : "");

export function hostSplitEnabled(): boolean {
  return STAFF_HOST.length > 0;
}

/** L'hôte de la requête est-il l'hôte "équipe" ? */
export function isStaffHost(host: string | null | undefined): boolean {
  if (!hostSplitEnabled() || !host) return false;
  const h = host.split(":")[0].toLowerCase();
  return h === STAFF_HOST.toLowerCase();
}
