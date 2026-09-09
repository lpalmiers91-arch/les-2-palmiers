"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Check,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Image as ImageIcon,
  RefreshCw,
  Monitor,
  Tablet,
  Smartphone,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";

const DEVICES = {
  desktop: { w: "100%", icon: Monitor },
  tablet: { w: "820px", icon: Tablet },
  phone: { w: "390px", icon: Smartphone },
} as const;
type Device = keyof typeof DEVICES;

type Block = {
  id: string;
  type: string;
  position: number;
  visible: boolean;
  content: Record<string, unknown>;
};

const BLOCK_KEYS = ["hero", "concierge", "apartment", "services", "tourism", "reviews", "closing"];

// champs texte simples éditables par type
const TEXT_FIELDS: Record<string, { key: string; label: string; multiline?: boolean }[]> = {
  hero: [
    { key: "eyebrow", label: "Sur-titre" },
    { key: "titleA", label: "Titre (début)" },
    { key: "titleB", label: "Titre (suite)" },
    { key: "titleEm", label: "Titre en italique" },
    { key: "lede", label: "Accroche", multiline: true },
    { key: "image", label: "Image (nom de fichier ou URL)" },
  ],
  concierge: [
    { key: "title", label: "Titre" },
    { key: "titleEm", label: "Titre en italique" },
    { key: "lede", label: "Texte", multiline: true },
    { key: "caption", label: "Légende" },
  ],
  apartment: [
    { key: "title", label: "Titre" },
    { key: "titleEm", label: "Titre en italique" },
    { key: "lede", label: "Texte", multiline: true },
  ],
  services: [
    { key: "title", label: "Titre" },
    { key: "titleEm", label: "Titre en italique" },
    { key: "lede", label: "Texte", multiline: true },
  ],
  tourism: [
    { key: "title", label: "Titre" },
    { key: "titleEm", label: "Titre en italique" },
    { key: "lede", label: "Texte", multiline: true },
  ],
  reviews: [
    { key: "title", label: "Titre" },
    { key: "lede", label: "Texte", multiline: true },
  ],
  closing: [
    { key: "quote", label: "Citation", multiline: true },
    { key: "ctaLabel", label: "Bouton" },
    { key: "contact", label: "Ligne contact" },
  ],
};

export function SiteEditor({ blocks: initial }: { blocks: Block[] }) {
  const router = useRouter();
  const { t } = useT();
  const blockLabel = (type: string) =>
    BLOCK_KEYS.includes(type) ? t(`console.siteEditor.block.${type}`) : type;
  const [blocks, setBlocks] = useState<Block[]>(initial);
  const [selected, setSelected] = useState<string | null>(initial[0]?.id ?? null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [device, setDevice] = useState<Device>("desktop");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const current = blocks.find((b) => b.id === selected);

  function patch(id: string, up: Partial<Block>) {
    setBlocks((bs) => bs.map((b) => (b.id === id ? { ...b, ...up } : b)));
  }
  function patchContent(id: string, key: string, value: unknown) {
    setBlocks((bs) =>
      bs.map((b) => (b.id === id ? { ...b, content: { ...b.content, [key]: value } } : b)),
    );
  }

  async function move(id: string, dir: -1 | 1) {
    const sorted = [...blocks].sort((a, b) => a.position - b.position);
    const i = sorted.findIndex((b) => b.id === id);
    const j = i + dir;
    if (j < 0 || j >= sorted.length) return;
    const a = sorted[i],
      b = sorted[j];
    patch(a.id, { position: b.position });
    patch(b.id, { position: a.position });
  }

  async function saveAll() {
    setSaving(true);
    setSaved(false);
    const supabase = createClient();
    for (const b of blocks) {
      await supabase
        .from("site_blocks")
        .update({ position: b.position, visible: b.visible, content: b.content as never })
        .eq("id", b.id);
    }
    setSaving(false);
    setSaved(true);
    router.refresh();
    iframeRef.current?.contentWindow?.location.reload();
    setTimeout(() => setSaved(false), 2500);
  }

  async function uploadImage(id: string, key: string, file: File) {
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `home/${id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("site-media").upload(path, file, {
      upsert: true,
      contentType: file.type,
    });
    if (error) return;
    const { data } = supabase.storage.from("site-media").getPublicUrl(path);
    patchContent(id, key, data.publicUrl);
  }

  const sorted = [...blocks].sort((a, b) => a.position - b.position);

  return (
    <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
      {/* panneau d'édition */}
      <div className="space-y-4">
        <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-3">
          <ul className="space-y-1">
            {sorted.map((b) => (
              <li key={b.id}>
                <button
                  onClick={() => setSelected(b.id)}
                  className={`flex w-full items-center justify-between gap-2 rounded-[10px] px-3 py-2 text-left text-[13px] ${
                    selected === b.id ? "bg-forest text-bone" : "text-ink-2 hover:bg-ink/5"
                  }`}
                >
                  <span className={b.visible ? "" : "opacity-40"}>
                    {blockLabel(b.type)}
                  </span>
                  <span className="flex items-center gap-0.5">
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        move(b.id, -1);
                      }}
                      className="press rounded p-1 hover:bg-black/10"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        move(b.id, 1);
                      }}
                      className="press rounded p-1 hover:bg-black/10"
                    >
                      <ArrowDown className="h-3 w-3" />
                    </span>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        patch(b.id, { visible: !b.visible });
                      }}
                      className="press rounded p-1 hover:bg-black/10"
                    >
                      {b.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        {current && (
          <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-4">
            <p className="text-[13px] font-medium text-ink">{blockLabel(current.type)}</p>
            <div className="mt-3 space-y-3">
              {(TEXT_FIELDS[current.type] ?? []).map((f) => {
                const val = String(current.content[f.key] ?? "");
                const isImage = f.key === "image";
                return (
                  <label key={f.key} className="block">
                    <span className="mb-1 block text-[12px] font-medium text-ink-2">{f.label}</span>
                    {isImage ? (
                      <div className="flex gap-2">
                        <input
                          className="field flex-1 text-[13px]"
                          value={val}
                          onChange={(e) => patchContent(current.id, f.key, e.target.value)}
                        />
                        <label className="press flex h-[46px] w-[46px] shrink-0 cursor-pointer items-center justify-center rounded-[11px] border border-line text-ink-3 hover:border-ink/30">
                          <ImageIcon className="h-4 w-4" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) uploadImage(current.id, f.key, file);
                            }}
                          />
                        </label>
                      </div>
                    ) : f.multiline ? (
                      <textarea
                        className="field min-h-[80px] resize-y text-[13px]"
                        value={val}
                        onChange={(e) => patchContent(current.id, f.key, e.target.value)}
                      />
                    ) : (
                      <input
                        className="field text-[13px]"
                        value={val}
                        onChange={(e) => patchContent(current.id, f.key, e.target.value)}
                      />
                    )}
                  </label>
                );
              })}
              {!TEXT_FIELDS[current.type] && (
                <p className="text-[12px] text-ink-3">
                  {t("console.siteEditor.dataDriven")}
                </p>
              )}
            </div>
          </div>
        )}

        <button
          onClick={saveAll}
          disabled={saving}
          className="press flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ink text-[13.5px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : saved ? (
            <Check className="h-4 w-4" />
          ) : null}
          {saved ? t("console.siteEditor.publishedOk") : t("console.siteEditor.savePublish")}
        </button>
      </div>

      {/* aperçu live */}
      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-bone">
        <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2 text-[12px] text-ink-3">
          <div className="flex items-center gap-1 rounded-full border border-line p-0.5">
            {(Object.keys(DEVICES) as Device[]).map((d) => {
              const Icon = DEVICES[d].icon;
              return (
                <button
                  key={d}
                  onClick={() => setDevice(d)}
                  aria-label={t(`console.siteEditor.device.${d}`)}
                  className={`press rounded-full p-1.5 ${
                    device === d ? "bg-forest text-bone" : "text-ink-3 hover:text-ink"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                </button>
              );
            })}
          </div>
          <button
            onClick={() => iframeRef.current?.contentWindow?.location.reload()}
            className="press flex items-center gap-1 hover:text-ink"
          >
            <RefreshCw className="h-3 w-3" /> {t("console.siteEditor.refresh")}
          </button>
        </div>
        <div className="flex justify-center overflow-auto bg-bone-2 p-3">
          <iframe
            ref={iframeRef}
            src="/"
            title={t("console.siteEditor.preview")}
            className="h-[70dvh] shrink-0 rounded-[8px] border border-line bg-bone transition-[width] duration-300"
            style={{ width: DEVICES[device].w, maxWidth: "100%" }}
          />
        </div>
      </div>
    </div>
  );
}
