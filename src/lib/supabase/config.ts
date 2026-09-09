// Coordonnées publiques du projet Supabase.
// L'URL et la clé anon sont conçues pour être publiques (la RLS protège tout).
// Les variables d'environnement priment ; ces valeurs servent de repli.
// `||` (et pas `??`) pour aussi ignorer une variable définie mais vide.

export const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://zmobadwgoqcwkryefciq.supabase.co";

export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inptb2JhZHdnb3Fjd2tyeWVmY2lxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg5MDE5NTIsImV4cCI6MjEwNDQ3Nzk1Mn0.y2xsRIML2cIMFzJcx6eHmKv-zjpu9is0rGzAZ6xssm4";

export const FUNCTIONS_URL =
  process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL ||
  `${SUPABASE_URL}/functions/v1`;
