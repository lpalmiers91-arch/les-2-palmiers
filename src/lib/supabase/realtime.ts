"use client";

import { createClient } from "./client";

/**
 * Garantit que la connexion Realtime porte le JWT de l'utilisateur AVANT de
 * s'abonner. Sans ça, un `postgres_changes` sur une table protégée par RLS
 * rejoint en tant qu'`anon` et ne reçoit jamais d'événement.
 * (bug classique "il faut actualiser la page pour voir le message")
 */
export async function ensureRealtimeAuth() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (token) {
    // setAuth accepte le token (versions récentes) — no-op si déjà à jour
    supabase.realtime.setAuth(token);
  }
  return supabase;
}
