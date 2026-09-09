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
