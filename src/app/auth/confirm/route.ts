import { type NextRequest, NextResponse } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { sanitizeInternalRedirect } from "@/lib/spaces";

// Cible des liens e-mail (confirmation, réinitialisation, changement d'adresse)
// ET du retour OAuth (Google) : flux ?code= (PKCE), flux token_hash, ou session
// déjà posée par Supabase.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = (searchParams.get("type") || "") as EmailOtpType | "";
  const suite = sanitizeInternalRedirect(searchParams.get("suite"), "/app");
  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(new URL("/connexion?erreur=lien-invalide", request.url));
    }
  } else if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (error) {
      return NextResponse.redirect(new URL("/connexion?erreur=lien-invalide", request.url));
    }
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/connexion?erreur=lien-invalide", request.url));
  }

  // récupération de mot de passe : on va sur la page dédiée
  if (type === "recovery") {
    return NextResponse.redirect(new URL("/app/compte?reset=1", request.url));
  }

  // aiguillage par rôle : un membre de l'équipe ne va jamais dans l'espace client
  const { data: roleRows } = await supabase
    .from("user_roles")
    .select("role_id")
    .eq("user_id", user.id);
  const roles = (roleRows ?? []).map((r) => r.role_id as string);
  const isTeam = roles.some((r) => ["admin", "staff", "coordinator"].includes(r));

  let dest = suite;
  if (isTeam) {
    dest = suite.startsWith("/staff") || suite.startsWith("/admin")
      ? suite
      : roles.includes("admin")
        ? "/admin"
        : "/staff";
  } else if (dest.startsWith("/staff") || dest.startsWith("/admin") || dest === "/equipe") {
    dest = "/app";
  }

  // filet de sécurité : la destination finale reste un chemin interne.
  return NextResponse.redirect(new URL(sanitizeInternalRedirect(dest, "/app"), request.url));
}
