import "server-only";
import { cache } from "react";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { site } from "@/lib/site";

export type SeoSettings = {
  keywords?: string[];
  default_description?: string;
  priceRange?: string;
  geo?: { lat?: number; lng?: number };
  twitter?: string;
  google_verification?: string;
};

export const getSeoSettings = cache(async (): Promise<SeoSettings> => {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("site_settings").select("seo").eq("id", 1).maybeSingle();
    return (data?.seo ?? {}) as SeoSettings;
  } catch {
    return {};
  }
});

const allMeta = cache(async () => {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("seo_meta").select("path, title, description, og_image, no_index");
    const map = new Map<string, { title: string | null; description: string | null; og_image: string | null; no_index: boolean }>();
    for (const r of data ?? []) map.set(r.path as string, r as never);
    return map;
  } catch {
    return new Map();
  }
});

/** Métadonnées d'une page publique, avec les surcharges SEO du back-office. */
export async function pageMeta(
  path: string,
  fallback: { title: string; description?: string },
): Promise<Metadata> {
  const [settings, metas] = await Promise.all([getSeoSettings(), allMeta()]);
  const o = metas.get(path);
  const title = o?.title || fallback.title;
  const description = o?.description || fallback.description || settings.default_description;
  const meta: Metadata = {
    title,
    description,
    keywords: settings.keywords?.length ? settings.keywords : undefined,
    alternates: { canonical: `${site.url}${path === "/" ? "" : path}` },
    openGraph: {
      title,
      description,
      url: `${site.url}${path === "/" ? "" : path}`,
      ...(o?.og_image ? { images: [{ url: o.og_image }] } : {}),
    },
    ...(o?.no_index ? { robots: { index: false, follow: false } } : {}),
  };
  return meta;
}
