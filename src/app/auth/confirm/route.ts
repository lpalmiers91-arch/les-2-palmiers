import { type NextRequest, NextResponse } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Cible des liens e-mail (confirmation d'inscription, réinitialisation, changement d'adresse).
// Gère le flux token_hash ET le flux ConfirmationURL par défaut (session déjà posée par Supabase).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = (searchParams.get("type") || "") as EmailOtpType | "";
  const suite = searchParams.get("suite") || "/app";
  const supabase = await createClient();

  if (token_hash && type) {
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

  const dest = type === "recovery" ? "/app/compte?reset=1" : suite;
  return NextResponse.redirect(new URL(dest, request.url));
}
