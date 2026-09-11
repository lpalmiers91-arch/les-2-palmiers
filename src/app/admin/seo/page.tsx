import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageTitle } from "@/components/app/ui";
import {
  SeoManager,
  type SeoRoute,
  type SeoMetaRow,
  type SeoSettings,
  type SeoCheck,
} from "@/components/console/seo-manager";
import { getT } from "@/lib/i18n";

export const metadata: Metadata = { title: "SEO / Référencement" };

const STATIC_ROUTES: { path: string; labelKey: string }[] = [
  { path: "/", labelKey: "seo.route.home" },
  { path: "/appartements", labelKey: "seo.route.apartments" },
  { path: "/services", labelKey: "seo.route.services" },
  { path: "/contact", labelKey: "seo.route.contact" },
];

export default async function AdminSeoPage() {
  const { t } = await getT();
  const supabase = await createClient();

  const [{ data: settingsRow }, { data: metas }, { data: apts }, { data: pages }] = await Promise.all([
    supabase.from("site_settings").select("seo").eq("id", 1).maybeSingle(),
    supabase.from("seo_meta").select("path, title, description, no_index"),
    supabase.from("apartments").select("slug, name, summary, status").eq("status", "published"),
    supabase.from("site_pages").select("slug, title").eq("status", "published"),
  ]);

  const routes: SeoRoute[] = [
    ...STATIC_ROUTES.map((r) => ({ path: r.path, label: t(r.labelKey), kind: "static" as const })),
    ...(apts ?? []).map((a) => ({
      path: `/appartements/${a.slug}`,
      label: a.name as string,
      kind: "apartment" as const,
    })),
    ...(pages ?? []).map((p) => ({
      path: `/p/${p.slug}`,
      label: (p.title as string) || (p.slug as string),
      kind: "page" as const,
    })),
  ];

  const settings = (settingsRow?.seo ?? {}) as SeoSettings;
  const metaRows = (metas ?? []) as SeoMetaRow[];
  const metaByPath = new Map(metaRows.map((m) => [m.path, m]));

  const aptMissingSummary = (apts ?? []).filter((a) => !a.summary || (a.summary as string).length < 40).length;
  const homeMeta = metaByPath.get("/");

  const checks: SeoCheck[] = [
    { key: "sitemap", ok: true, detail: `${routes.length} URL` },
    { key: "robots", ok: true },
    { key: "jsonld", ok: true },
    { key: "homeMeta", ok: !!(homeMeta?.title && homeMeta?.description) },
    {
      key: "aptSummaries",
      ok: aptMissingSummary === 0,
      detail: aptMissingSummary > 0 ? t("seo.check.aptSummariesDetail", { n: aptMissingSummary }) : undefined,
    },
    { key: "keywords", ok: (settings.keywords?.length ?? 0) >= 3 },
    { key: "ogImages", ok: true },
    { key: "canonical", ok: true },
    { key: "https", ok: true },
    {
      key: "descLengths",
      ok: metaRows.every((m) => !m.description || (m.description.length >= 80 && m.description.length <= 170)),
    },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title={t("seo.title")} sub={t("seo.sub")} />
      <SeoManager routes={routes} metas={metaRows} settings={settings} checks={checks} />
    </div>
  );
}
