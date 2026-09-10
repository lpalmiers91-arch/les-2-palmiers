import { DEFAULT_LOCALE } from "@/lib/i18n/languages";

type ServiceI18n = { title?: string; description?: string };

/**
 * Superpose la traduction `i18n[locale]` sur les champs texte d'un service.
 * Pure (utilisable côté serveur et client). Le français reste dans les colonnes de base.
 */
export function pickServiceI18n<
  T extends { title?: string | null; description?: string | null; i18n?: unknown },
>(row: T, locale: string): T {
  if (!row || locale === DEFAULT_LOCALE) return row;
  const tr = (row.i18n as Record<string, ServiceI18n> | null | undefined)?.[locale];
  if (!tr) return row;
  return {
    ...row,
    ...(tr.title ? { title: tr.title } : {}),
    ...(tr.description ? { description: tr.description } : {}),
  };
}

/** Idem pour une catégorie de service (champ `label`). */
export function pickCategoryI18n<T extends { label?: string | null; i18n?: unknown }>(
  row: T,
  locale: string,
): T {
  if (!row || locale === DEFAULT_LOCALE) return row;
  const tr = (row.i18n as Record<string, { label?: string }> | null | undefined)?.[locale];
  return tr?.label ? { ...row, label: tr.label } : row;
}
