"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";

const FONT_VALUES = ["", "Playfair Display", "Fraunces", "Space Grotesk", "Instrument Serif"];
const FONT_KEY: Record<string, string> = {
  "": "default",
  "Playfair Display": "playfair",
  Fraunces: "fraunces",
  "Space Grotesk": "spaceGrotesk",
  "Instrument Serif": "instrumentSerif",
};

export function BrandingForm({ initial }: { initial: Record<string, string> }) {
  const router = useRouter();
  const { t } = useT();
  const [b, setB] = useState<Record<string, string>>(initial);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const faviconRef = useRef<HTMLInputElement>(null);
  const logoRef = useRef<HTMLInputElement>(null);

  function f(k: string, v: string) {
    setB((p) => ({ ...p, [k]: v }));
  }

  async function upload(kind: "favicon_url" | "logo_url", file: File) {
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("branding").upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    if (error) return;
    const { data } = supabase.storage.from("branding").getPublicUrl(path);
    f(kind, data.publicUrl);
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    await createClient().from("site_settings").update({ branding: b }).eq("id", 1);
    setSaving(false);
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-ink-2">
            {t("console.branding.favicon")}{" "}
            <span className="text-ink-3">{t("console.branding.faviconHint")}</span>
          </span>
          <div className="flex items-center gap-3">
            {b.favicon_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.favicon_url} alt="" className="h-10 w-10 rounded-lg border border-line" />
            )}
            <button
              onClick={() => faviconRef.current?.click()}
              className="press flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-[13px] font-medium text-ink hover:border-ink/30"
            >
              <Upload className="h-3.5 w-3.5" /> {t("console.branding.choose")}
            </button>
            <input
              ref={faviconRef}
              type="file"
              accept="image/png,image/x-icon,image/svg+xml"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && upload("favicon_url", e.target.files[0])}
            />
          </div>
        </div>

        <div>
          <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{t("console.branding.logo")}</span>
          <div className="flex items-center gap-3">
            {b.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.logo_url} alt="" className="h-10 rounded-lg border border-line bg-forest p-1" />
            )}
            <button
              onClick={() => logoRef.current?.click()}
              className="press flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-[13px] font-medium text-ink hover:border-ink/30"
            >
              <Upload className="h-3.5 w-3.5" /> {t("console.branding.choose")}
            </button>
            <input
              ref={logoRef}
              type="file"
              accept="image/png,image/svg+xml,image/webp"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && upload("logo_url", e.target.files[0])}
            />
          </div>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{t("console.branding.wordmark")}</span>
          <input
            className="field"
            value={b.wordmark ?? ""}
            onChange={(e) => f("wordmark", e.target.value)}
            placeholder="Les 2 Palmiers"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{t("console.branding.font")}</span>
          <select
            className="field"
            value={b.font_display ?? ""}
            onChange={(e) => f("font_display", e.target.value)}
          >
            {FONT_VALUES.map((v) => (
              <option key={v} value={v}>
                {t(`console.branding.fontOpt.${FONT_KEY[v]}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{t("console.branding.accent")}</span>
          <input
            type="color"
            className="h-11 w-full cursor-pointer rounded-[11px] border border-line"
            value={b.accent || "#aa6548"}
            onChange={(e) => f("accent", e.target.value)}
          />
        </label>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="press mt-5 flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-6 text-[13.5px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
        {saved ? t("console.action.saved") : t("console.branding.save")}
      </button>
    </div>
  );
}
