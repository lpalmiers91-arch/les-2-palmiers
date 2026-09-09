"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Trash2,
  Loader2,
  Check,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  ExternalLink,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";

type Page = {
  id: string;
  slug: string;
  title: string;
  nav_label: string | null;
  in_nav: boolean;
  nav_order: number;
  status: string;
};
type Block = {
  id: string;
  page_id: string;
  type: string;
  position: number;
  visible: boolean;
  content: Record<string, unknown>;
};

const BLOCK_TYPES: { type: string; fields: { key: string; fk: string; area?: boolean }[] }[] = [
  {
    type: "rich_text",
    fields: [
      { key: "heading", fk: "heading" },
      { key: "body", fk: "bodyParagraphs", area: true },
    ],
  },
  {
    type: "image",
    fields: [
      { key: "url", fk: "imageUrl" },
      { key: "caption", fk: "caption" },
      { key: "alt", fk: "alt" },
    ],
  },
  {
    type: "cta",
    fields: [
      { key: "title", fk: "heading" },
      { key: "text", fk: "text", area: true },
      { key: "href", fk: "link" },
      { key: "label", fk: "buttonLabel" },
    ],
  },
];

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // retire les accents (ê -> e, é -> e)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

export function PagesManager({
  pages: initialPages,
  blocks: initialBlocks,
}: {
  pages: Page[];
  blocks: Block[];
}) {
  const router = useRouter();
  const { t } = useT();
  const [pages, setPages] = useState<Page[]>(initialPages);
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);
  const [openId, setOpenId] = useState<string | null>(initialPages[0]?.id ?? null);
  const [newTitle, setNewTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(null);

  const supabase = () => createClient();

  async function createPage() {
    const title = newTitle.trim();
    if (!title) return;
    const slug = slugify(title) || `page-${Date.now()}`;
    setBusy(true);
    const { data, error } = await supabase()
      .from("site_pages")
      .insert({ slug, title, nav_label: title, in_nav: false, status: "draft" })
      .select("id, slug, title, nav_label, in_nav, nav_order, status")
      .single();
    setBusy(false);
    if (error || !data) return;
    setPages((p) => [...p, data as Page]);
    setOpenId(data.id);
    setNewTitle("");
    router.refresh();
  }

  async function patchPage(id: string, patch: Partial<Page>) {
    setPages((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    await supabase().from("site_pages").update(patch).eq("id", id);
    router.refresh();
  }

  async function deletePage(id: string) {
    if (!confirm(t("console.pagesMgr.confirmDelete"))) return;
    setPages((p) => p.filter((x) => x.id !== id));
    setBlocks((b) => b.filter((x) => x.page_id !== id));
    await supabase().from("site_pages").delete().eq("id", id);
    router.refresh();
  }

  async function addBlock(pageId: string, type: string) {
    const pos =
      Math.max(0, ...blocks.filter((b) => b.page_id === pageId).map((b) => b.position)) + 1;
    const { data, error } = await supabase()
      .from("site_blocks")
      .insert({ page_id: pageId, type, position: pos, visible: true, content: {} })
      .select("id, page_id, type, position, visible, content")
      .single();
    if (error || !data) return;
    setBlocks((b) => [...b, data as Block]);
  }

  function editBlock(id: string, key: string, value: unknown) {
    setBlocks((bs) =>
      bs.map((b) => (b.id === id ? { ...b, content: { ...b.content, [key]: value } } : b)),
    );
  }

  async function saveBlocks(pageId: string) {
    setBusy(true);
    for (const b of blocks.filter((x) => x.page_id === pageId)) {
      await supabase()
        .from("site_blocks")
        .update({ position: b.position, visible: b.visible, content: b.content as never })
        .eq("id", b.id);
    }
    setBusy(false);
    setSavedId(pageId);
    router.refresh();
    setTimeout(() => setSavedId((s) => (s === pageId ? null : s)), 2200);
  }

  async function uploadImage(blockId: string, file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `pages/${blockId}-${Date.now()}.${ext}`;
    const { error } = await supabase()
      .storage.from("site-media")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) return;
    const { data } = supabase().storage.from("site-media").getPublicUrl(path);
    editBlock(blockId, "url", data.publicUrl);
  }

  function moveBlock(pageId: string, id: string, dir: -1 | 1) {
    const list = blocks
      .filter((b) => b.page_id === pageId)
      .sort((a, b) => a.position - b.position);
    const i = list.findIndex((b) => b.id === id);
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const a = list[i];
    const b = list[j];
    setBlocks((bs) =>
      bs.map((x) =>
        x.id === a.id ? { ...x, position: b.position } : x.id === b.id ? { ...x, position: a.position } : x,
      ),
    );
  }

  async function deleteBlock(id: string) {
    setBlocks((b) => b.filter((x) => x.id !== id));
    await supabase().from("site_blocks").delete().eq("id", id);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 rounded-[var(--radius-lg)] border border-line bg-bone p-4 sm:flex-row sm:items-center">
        <input
          className="field flex-1 text-[13px]"
          placeholder={t("console.pagesMgr.newTitlePlaceholder")}
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <button
          onClick={createPage}
          disabled={busy || !newTitle.trim()}
          className="press flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-[13px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" /> {t("console.pagesMgr.create")}
        </button>
      </div>

      {pages.length === 0 && (
        <p className="rounded-[var(--radius-lg)] border border-dashed border-line px-4 py-8 text-center text-[13px] text-ink-3">
          {t("console.pagesMgr.empty")} <code>/p/slug</code>.
        </p>
      )}

      {pages.map((pg) => {
        const isOpen = openId === pg.id;
        const pageBlocks = blocks
          .filter((b) => b.page_id === pg.id)
          .sort((a, b) => a.position - b.position);
        return (
          <div key={pg.id} className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-bone">
            <div className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
              <button
                onClick={() => setOpenId(isOpen ? null : pg.id)}
                className="press min-w-0 flex-1 text-left"
              >
                <p className="truncate text-[14px] font-medium text-ink">{pg.title}</p>
                <p className="text-[12px] text-ink-3">
                  /p/{pg.slug} · {pg.status === "published" ? t("console.pagesMgr.publishedLc") : t("console.pagesMgr.draftLc")}
                  {pg.in_nav ? ` · ${t("console.pagesMgr.inMenuLc")}` : ""}
                </p>
              </button>
              {pg.status === "published" && (
                <a
                  href={`/p/${pg.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="press text-ink-3 hover:text-ink"
                  aria-label={t("console.pagesMgr.viewPage")}
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
              <button
                onClick={() => deletePage(pg.id)}
                className="press text-ink-3 hover:text-danger"
                aria-label={t("console.action.delete")}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {isOpen && (
              <div className="border-t border-line px-4 py-4 sm:px-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-[12px] font-medium text-ink-2">{t("console.pagesMgr.titleField")}</span>
                    <input
                      className="field text-[13px]"
                      defaultValue={pg.title}
                      onBlur={(e) =>
                        e.target.value.trim() &&
                        e.target.value !== pg.title &&
                        patchPage(pg.id, { title: e.target.value.trim() })
                      }
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[12px] font-medium text-ink-2">
                      {t("console.pagesMgr.menuLabel")}
                    </span>
                    <input
                      className="field text-[13px]"
                      defaultValue={pg.nav_label ?? ""}
                      onBlur={(e) => patchPage(pg.id, { nav_label: e.target.value.trim() || null })}
                    />
                  </label>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      patchPage(pg.id, {
                        status: pg.status === "published" ? "draft" : "published",
                      })
                    }
                    className={`press h-9 rounded-full px-4 text-[12.5px] font-medium ${
                      pg.status === "published"
                        ? "bg-forest text-bone"
                        : "border border-line text-ink"
                    }`}
                  >
                    {pg.status === "published" ? t("console.status.published") : t("console.action.publish")}
                  </button>
                  <button
                    onClick={() => patchPage(pg.id, { in_nav: !pg.in_nav })}
                    className={`press h-9 rounded-full px-4 text-[12.5px] font-medium ${
                      pg.in_nav ? "bg-forest text-bone" : "border border-line text-ink"
                    }`}
                  >
                    {pg.in_nav ? t("console.pagesMgr.inMenu") : t("console.pagesMgr.addToMenu")}
                  </button>
                </div>

                <div className="mt-5 space-y-3">
                  {pageBlocks.map((b) => {
                    const def = BLOCK_TYPES.find((x) => x.type === b.type);
                    return (
                      <div key={b.id} className="rounded-[12px] border border-line bg-bone-2 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[12px] font-medium text-ink-2">
                            {def ? t(`console.pagesMgr.block.${b.type}`) : b.type}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <button
                              onClick={() => moveBlock(pg.id, b.id, -1)}
                              className="press rounded p-1 text-ink-3 hover:bg-black/5"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => moveBlock(pg.id, b.id, 1)}
                              className="press rounded p-1 text-ink-3 hover:bg-black/5"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                setBlocks((bs) =>
                                  bs.map((x) =>
                                    x.id === b.id ? { ...x, visible: !x.visible } : x,
                                  ),
                                )
                              }
                              className="press rounded p-1 text-ink-3 hover:bg-black/5"
                            >
                              {b.visible ? (
                                <Eye className="h-3.5 w-3.5" />
                              ) : (
                                <EyeOff className="h-3.5 w-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => deleteBlock(b.id)}
                              className="press rounded p-1 text-ink-3 hover:text-danger"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </span>
                        </div>
                        <div className="space-y-2.5">
                          {(def?.fields ?? []).map((f) => {
                            const val = String(b.content[f.key] ?? "");
                            if (f.key === "url") {
                              return (
                                <div key={f.key} className="flex gap-2">
                                  <input
                                    className="field flex-1 text-[13px]"
                                    placeholder={t(`console.pagesMgr.field.${f.fk}`)}
                                    value={val}
                                    onChange={(e) => editBlock(b.id, f.key, e.target.value)}
                                  />
                                  <label className="press flex h-[46px] w-[46px] shrink-0 cursor-pointer items-center justify-center rounded-[11px] border border-line text-ink-3">
                                    <Plus className="h-4 w-4" />
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) =>
                                        e.target.files?.[0] &&
                                        uploadImage(b.id, e.target.files[0])
                                      }
                                    />
                                  </label>
                                </div>
                              );
                            }
                            return f.area ? (
                              <textarea
                                key={f.key}
                                className="field min-h-[80px] resize-y text-[13px]"
                                placeholder={t(`console.pagesMgr.field.${f.fk}`)}
                                value={val}
                                onChange={(e) => editBlock(b.id, f.key, e.target.value)}
                              />
                            ) : (
                              <input
                                key={f.key}
                                className="field text-[13px]"
                                placeholder={t(`console.pagesMgr.field.${f.fk}`)}
                                value={val}
                                onChange={(e) => editBlock(b.id, f.key, e.target.value)}
                              />
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {BLOCK_TYPES.map((bt) => (
                    <button
                      key={bt.type}
                      onClick={() => addBlock(pg.id, bt.type)}
                      className="press flex h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-[12.5px] font-medium text-ink hover:border-ink/30"
                    >
                      <Plus className="h-3.5 w-3.5" /> {t(`console.pagesMgr.block.${bt.type}`)}
                    </button>
                  ))}
                </div>

                <button
                  onClick={() => saveBlocks(pg.id)}
                  disabled={busy}
                  className="press mt-4 flex h-10 items-center justify-center gap-2 rounded-full bg-ink px-5 text-[13px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : savedId === pg.id ? (
                    <Check className="h-4 w-4" />
                  ) : null}
                  {savedId === pg.id ? t("console.action.saved") : t("console.pagesMgr.saveContent")}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
