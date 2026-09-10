import type { MetadataRoute } from "next";
import { site } from "@/lib/site";
import { listApartments } from "@/lib/apartments";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = site.url;
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/appartements",
    "/services",
    "/le-lieu",
    "/avis",
    "/contact",
    "/reserver",
    "/connexion",
    "/inscription",
    "/legal/mentions",
    "/legal/cgv",
    "/legal/confidentialite",
    "/legal/cookies",
  ].map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : path === "/appartements" || path === "/reserver" ? 0.9 : 0.6,
  }));

  let apartmentRoutes: MetadataRoute.Sitemap = [];
  let cmsRoutes: MetadataRoute.Sitemap = [];
  try {
    const apts = await listApartments();
    apartmentRoutes = apts.map((a) => ({
      url: `${base}/appartements/${a.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    const supabase = await createClient();
    const { data: pages } = await supabase
      .from("site_pages")
      .select("slug, updated_at")
      .eq("status", "published");
    cmsRoutes = (pages ?? []).map((p) => ({
      url: `${base}/p/${p.slug}`,
      lastModified: p.updated_at ? new Date(p.updated_at as string) : now,
      changeFrequency: "monthly",
      priority: 0.5,
    }));
  } catch {
    // build-time / DB indisponible : on sert au moins les routes statiques.
  }

  return [...staticRoutes, ...apartmentRoutes, ...cmsRoutes];
}
