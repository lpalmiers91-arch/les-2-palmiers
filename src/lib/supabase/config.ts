// Coordonnées publiques du projet Supabase.
// L'URL et la clé anon sont conçues pour être publiques (la RLS protège tout),
// mais ne DOIVENT PAS avoir de repli en dur sur le projet réel : en cas de
// variable d'environnement manquante (build mal configuré, fork du repo,
// preview incomplet), l'app doit échouer bruyamment plutôt que de se
// connecter silencieusement au backend Supabase de production.
// `?.trim()` (et pas juste falsy-check) pour aussi rejeter une variable
// définie mais vide.

function required(name: string, value: string | undefined): string {
  const v = value?.trim();
  if (!v) {
    throw new Error(
      `[supabase/config] variable d'environnement manquante : ${name} — ` +
        `voir .env.example (aucun repli sur les identifiants réels du projet).`,
    );
  }
  return v;
}

export const SUPABASE_URL = required(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL,
);

export const SUPABASE_ANON_KEY = required(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const FUNCTIONS_URL =
  process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL?.trim() || `${SUPABASE_URL}/functions/v1`;

// Clé publique VAPID pour les notifications push web (Web Push).
// La clé privée reste côté Edge Function (secret Supabase).
// Contrairement à SUPABASE_URL/ANON_KEY, l'absence de cette variable ne doit
// pas casser l'app : le push est une fonctionnalité optionnelle, désactivée
// proprement (voir src/lib/push.ts) plutôt que de retomber sur une vraie clé
// VAPID codée en dur.
export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() || "";
