// Langues prises en charge par l'application (profil + sélecteur + i18n).
// L'ordre est celui du sélecteur. `dir` sert au rendu RTL (arabe).

export const LOCALES = ["fr", "en", "es", "zh", "ar", "pt", "de", "it", "ru", "ja"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fr";

export const LANGUAGES: {
  code: Locale;
  label: string; // nom dans la langue elle-même
  english: string;
  dir: "ltr" | "rtl";
}[] = [
  { code: "fr", label: "Français", english: "French", dir: "ltr" },
  { code: "en", label: "English", english: "English", dir: "ltr" },
  { code: "es", label: "Español", english: "Spanish", dir: "ltr" },
  { code: "zh", label: "中文", english: "Chinese", dir: "ltr" },
  { code: "ar", label: "العربية", english: "Arabic", dir: "rtl" },
  { code: "pt", label: "Português", english: "Portuguese", dir: "ltr" },
  { code: "de", label: "Deutsch", english: "German", dir: "ltr" },
  { code: "it", label: "Italiano", english: "Italian", dir: "ltr" },
  { code: "ru", label: "Русский", english: "Russian", dir: "ltr" },
  { code: "ja", label: "日本語", english: "Japanese", dir: "ltr" },
];

export function isLocale(v: string | null | undefined): v is Locale {
  return !!v && (LOCALES as readonly string[]).includes(v);
}

export function localeDir(code: string): "ltr" | "rtl" {
  return code === "ar" ? "rtl" : "ltr";
}
