import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cmsImg, pick } from "@/lib/cms";

type PageRow = {
  id: string;
  title: string;
  status: string;
  seo: Record<string, unknown>;
};
type BlockRow = {
  id: string;
  type: string;
  visible: boolean;
  content: Record<string, unknown>;
};

async function load(slug: string) {
  const supabase = await createClient();
  const { data: page } = await supabase
    .from("site_pages")
    .select("id, title, status, seo")
    .eq("slug", slug)
    .maybeSingle();
  if (!page || page.status !== "published") return null;
  const { data: blocks } = await supabase
    .from("site_blocks")
    .select("id, type, visible, content")
    .eq("page_id", page.id)
    .order("position");
  return {
    page: page as PageRow,
    blocks: ((blocks ?? []) as BlockRow[]).filter((b) => b.visible),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) return { title: "Page introuvable" };
  const seo = data.page.seo ?? {};
  return {
    title: pick(seo.title as string, data.page.title),
    description: pick(seo.description as string) || undefined,
  };
}

function paragraphs(body: string) {
  return body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function Block({ b }: { b: BlockRow }) {
  const c = b.content ?? {};

  if (b.type === "rich_text") {
    const heading = pick(c.heading as string);
    const body = pick(c.body as string);
    return (
      <section className="mx-auto max-w-2xl px-5 py-10 md:px-8">
        {heading && (
          <h2 className="display text-[1.6rem] leading-tight text-ink md:text-[2rem]">{heading}</h2>
        )}
        <div className="mt-4 space-y-4 text-[15px] leading-relaxed text-ink-2">
          {paragraphs(body).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </section>
    );
  }

  if (b.type === "image") {
    const url = cmsImg(pick(c.url as string));
    if (!url) return null;
    return (
      <figure className="mx-auto max-w-4xl px-5 py-6 md:px-8">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={pick(c.alt as string, c.caption as string)}
          className="w-full rounded-[var(--radius-lg)] border border-line object-cover"
        />
        {pick(c.caption as string) && (
          <figcaption className="mt-2 text-center text-[13px] text-ink-3">
            {pick(c.caption as string)}
          </figcaption>
        )}
      </figure>
    );
  }

  if (b.type === "cta") {
    return (
      <section className="mx-auto my-10 max-w-2xl px-5 md:px-8">
        <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-8 text-center">
          {pick(c.title as string) && (
            <h2 className="display text-[1.5rem] text-ink">{pick(c.title as string)}</h2>
          )}
          {pick(c.text as string) && (
            <p className="mx-auto mt-2 max-w-md text-[14px] text-ink-2">{pick(c.text as string)}</p>
          )}
          {pick(c.href as string) && (
            <a
              href={pick(c.href as string)}
              className="press mt-5 inline-flex h-11 items-center rounded-full bg-ink px-6 text-[13.5px] font-medium text-bone hover:bg-forest-2"
            >
              {pick(c.label as string, "En savoir plus")}
            </a>
          )}
        </div>
      </section>
    );
  }

  return null;
}

export default async function CmsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) notFound();

  return (
    <div className="bg-bone">
      <div className="pt-[120px] pb-20 md:pt-[148px]">
        <header className="mx-auto max-w-2xl px-5 md:px-8">
          <h1 className="display text-[2rem] leading-tight text-ink md:text-[2.6rem]">
            {data.page.title}
          </h1>
        </header>
        {data.blocks.map((b) => (
          <Block key={b.id} b={b} />
        ))}
      </div>
    </div>
  );
}
