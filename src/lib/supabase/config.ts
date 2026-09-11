// Coordonnées publiques du projet Supabase.
// L'URL et la clé anon sont conçues pour être publiques (la RLS protège tout).
// Les variables d'environnement priment ; ces valeurs servent de repli.
//
// INCIDENT 2026-09-11 : une version antérieure faisait échouer bruyamment le
// build (throw à l'import) si la variable était absente — hardening bien
// intentionné, mais les variables NEXT_PUBLIC_* sont inlinées au BUILD par
// Next.js, donc ce throw s'exécute dès le chargement du module pendant
// `next build`. Sur Vercel, ceci a fait échouer deux déploiements de suite
// (builds en échec, le site a continué de servir un build plus ancien sans
// que ça se voie — jusqu'à vérification explicite du statut du déploiement).
// Repli restauré ; on avertit sans casser le build si jamais la variable
// venait à manquer réellement (fork du repo, preview mal configuré).
// `||` (et pas `??`) pour aussi ignorer une variable définie mais vide.

function withFallback(name: string, value: string | undefined, fallback: string): string {
  const v = value?.trim();
  if (!v && typeof window === "undefined") {
    // console uniquement côté serveur/build : ne pollue pas la console du visiteur.
    console.warn(`[supabase/config] ${name} absente, repli sur la valeur publique par défaut.`);
  }
  return v || fallback;
}

export const SUPABASE_URL = withFallback(
  "NEXT_PUBLIC_SUPABASE_URL",
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  "https://zmobadwgoqcwkryefciq.supabase.co",
);

export const SUPABASE_ANON_KEY = withFallback(
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inptb2JhZHdnb3Fjd2tyeWVmY2lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MDE5NTIsImV4cCI6MjEwNDQ3Nzk1Mn0.y2xsRIML2cIMFzJcx6eHmKv-zjpu9is0rGzAZ6xssm4",
);

export const FUNCTIONS_URL =
  process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL?.trim() || `${SUPABASE_URL}/functions/v1`;

// Clé publique VAPID pour les notifications push web (Web Push).
// La clé privée reste côté Edge Function (secret Supabase).
export const VAPID_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ||
  "BJCgc_1YMqv8dMRVsWuuBGfJDr0EFj8pm0KjHOiNzCv_mN9EW1Yoyp_5HiU7tvWadAn7ZLy81yHtJT3O83goxRE";
