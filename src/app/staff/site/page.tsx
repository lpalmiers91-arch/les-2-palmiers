import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageTitle } from "@/components/app/ui";
import { getT } from "@/lib/i18n";
import { SiteEditor } from "@/components/console/site-editor";
import { BrandingForm } from "@/components/console/branding-form";
import { PagesManager } from "@/components/console/pages-manager";

export const metadata: Metadata = { title: "Site web" };

export default async function StaffSite() {
  const { t } = await getT();
  const supabase = await createClient();

  const { data: page } = await supabase
    .from("site_pages")
    .select("id")
    .eq("slug", "home")
    .maybeSingle();

  const { data: blocks } = page
    ? await supabase
        .from("site_blocks")
        .select("id, type, position, visible, content")
        .eq("page_id", page.id)
        .order("position")
    : { data: [] };

  const { data: settings } = await supabase
    .from("site_settings")
    .select("branding")
    .eq("id", 1)
    .maybeSingle();

  const { data: customPages } = await supabase
    .from("site_pages")
    .select("id, slug, title, nav_label, in_nav, nav_order, status")
    .eq("is_system", false)
    .order("nav_order");

  const pageIds = (customPages ?? []).map((p) => p.id);
  const { data: customBlocks } = pageIds.length
    ? await supabase
        .from("site_blocks")
        .select("id, page_id, type, position, visible, content")
        .in("page_id", pageIds)
        .order("position")
    : { data: [] };

  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle title={t("console.title.site")} sub={t("console.sub.site")} />
      <SiteEditor
        blocks={(blocks ?? []).map((b) => ({
          ...b,
          content: (b.content ?? {}) as Record<string, unknown>,
        }))}
      />

      <div className="mt-10">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
          {t("console.siteExtra.customPages")}
        </h2>
        <p className="mt-1 text-[13px] text-ink-3">{t("console.siteExtra.customPagesNote")}</p>
        <div className="mt-3">
          <PagesManager
            pages={customPages ?? []}
            blocks={(customBlocks ?? []).map((b) => ({
              ...b,
              content: (b.content ?? {}) as Record<string, unknown>,
            }))}
          />
        </div>
      </div>

      <div className="mt-10">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
          {t("console.siteExtra.appearance")}
        </h2>
        <div className="mt-3">
          <BrandingForm
            initial={(settings?.branding ?? {}) as Record<string, string>}
          />
        </div>
      </div>
    </div>
  );
}
