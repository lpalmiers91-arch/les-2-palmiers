import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Heart, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageTitle } from "@/components/app/ui";
import { getT } from "@/lib/i18n";
import { aptImg } from "@/lib/site";
import { formatXOF } from "@/lib/format";

export const metadata: Metadata = { title: "Favoris" };

export default async function FavoritesPage() {
  const { t } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: favs } = await supabase
    .from("favorites")
    .select("created_at, apartment:apartments(id, slug, name, address, base_price, status)")
    .eq("client_id", user!.id)
    .order("created_at", { ascending: false });

  const { data: media } = await supabase
    .from("apartment_media")
    .select("apartment_id, storage_path, is_cover, position");

  const rows = (favs ?? [])
    .map((f) => f.apartment as { id: string; slug: string; name: string; address: string | null; base_price: number; status: string } | null)
    .filter((a): a is NonNullable<typeof a> => !!a && a.status === "published");

  function cover(id: string): string | null {
    const own = (media ?? []).filter((m) => m.apartment_id === id);
    const c = own.find((m) => m.is_cover) ?? own.sort((x, y) => x.position - y.position)[0];
    const p = c?.storage_path as string | undefined;
    return p ? (/^https?:\/\//.test(p) ? p : aptImg(p)) : null;
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title={t("favorites.title")} sub={t("favorites.sub")} />

      {rows.length === 0 ? (
        <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-10 text-center">
          <Heart className="mx-auto h-8 w-8 text-line" />
          <p className="mt-3 text-[14px] font-medium text-ink">{t("favorites.emptyT")}</p>
          <p className="mt-1 text-[13px] text-ink-3">{t("favorites.emptyB")}</p>
          <Link
            href="/appartements"
            className="press mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-ink px-5 text-[13px] font-medium text-bone hover:bg-forest-2"
          >
            {t("favorites.browse")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {rows.map((a) => (
            <li key={a.id}>
              <Link
                href={`/appartements/${a.slug}`}
                className="group flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-bone transition-colors hover:border-ink/25"
              >
                <div className="relative aspect-[4/3] bg-bone-2">
                  {cover(a.id) && (
                    <Image src={cover(a.id)!} alt={a.name} fill sizes="360px" className="object-cover" />
                  )}
                </div>
                <div className="p-4">
                  <p className="display text-[1.05rem] text-ink">{a.name}</p>
                  {a.address && <p className="text-[12px] text-ink-3">{a.address}</p>}
                  <p className="mt-2 tnum text-[13px] text-ink-2">
                    {t("aptPub.from")} {formatXOF(a.base_price)} {t("aptPub.perNight")}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
