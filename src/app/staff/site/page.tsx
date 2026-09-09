import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageTitle } from "@/components/app/ui";
import { SiteEditor } from "@/components/console/site-editor";
import { BrandingForm } from "@/components/console/branding-form";

export const metadata: Metadata = { title: "Site web" };

export default async function StaffSite() {
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

  return (
    <div className="mx-auto max-w-6xl">
      <PageTitle
        title="Site web"
        sub="Modifiez le contenu de la page d'accueil. L'aperçu se met à jour à la publication."
      />
      <SiteEditor
        blocks={(blocks ?? []).map((b) => ({
          ...b,
          content: (b.content ?? {}) as Record<string, unknown>,
        }))}
      />

      <div className="mt-10">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">Apparence</h2>
        <div className="mt-3">
          <BrandingForm
            initial={(settings?.branding ?? {}) as Record<string, string>}
          />
        </div>
      </div>
    </div>
  );
}
