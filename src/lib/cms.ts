import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type Block = {
  id: string;
  type: string;
  position: number;
  visible: boolean;
  content: Record<string, unknown>;
};

/** Blocs d'une page CMS (par slug), triés. Mise en cache par requête. */
export const getPageBlocks = cache(async (slug: string): Promise<Block[]> => {
  const supabase = await createClient();
  const { data: page } = await supabase
    .from("site_pages")
    .select("id, status")
    .eq("slug", slug)
    .maybeSingle();
  if (!page) return [];
  const { data } = await supabase
    .from("site_blocks")
    .select("id, type, position, visible, content")
    .eq("page_id", page.id)
    .order("position");
  return (data ?? []) as Block[];
});

/** Contenu d'un bloc d'un type donné sur la page d'accueil (ou {} si absent/masqué). */
export const getHomeBlock = cache(async (type: string): Promise<Record<string, unknown>> => {
  const blocks = await getPageBlocks("home");
  const b = blocks.find((x) => x.type === type && x.visible);
  return b?.content ?? {};
});

export const getBranding = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_settings")
    .select("branding")
    .eq("id", 1)
    .maybeSingle();
  return (data?.branding ?? {}) as {
    favicon_url?: string;
    logo_url?: string;
    wordmark?: string;
    font_display?: string;
    font_body?: string;
    accent?: string;
  };
});

/** Pages CMS publiées à mettre dans la navigation. */
export const getNavPages = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("site_pages")
    .select("slug, nav_label, title")
    .eq("status", "published")
    .eq("in_nav", true)
    .order("nav_order");
  return (data ?? []).map((p) => ({
    href: `/p/${p.slug}`,
    label: p.nav_label || p.title,
  }));
});

/** pick : renvoie la 1re valeur non vide (string) parmi les candidats. */
export function pick(...vals: unknown[]): string {
  for (const v of vals) if (typeof v === "string" && v.trim() !== "") return v;
  return "";
}

/** Résout une image CMS : URL absolue telle quelle, sinon fichier du bucket apartment-media. */
export function cmsImg(v: string): string {
  if (!v) return "";
  if (/^https?:\/\//.test(v) || v.startsWith("/")) return v;
  const base =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://zmobadwgoqcwkryefciq.supabase.co";
  return `${base}/storage/v1/object/public/apartment-media/${v}`;
}
