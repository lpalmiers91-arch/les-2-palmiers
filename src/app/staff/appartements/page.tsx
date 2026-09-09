import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageTitle, EmptyState } from "@/components/app/ui";
import { getT } from "@/lib/i18n";
import { NewApartmentButton } from "@/components/console/apartment-editor";
import { aptImg } from "@/lib/site";
import { formatXOF } from "@/lib/format";

export const metadata: Metadata = { title: "Appartements" };

const STATUS: Record<string, { key: string; cls: string }> = {
  published: { key: "online", cls: "bg-ok/12 text-forest-2" },
  draft: { key: "draft", cls: "bg-warn/12 text-warn" },
  hidden: { key: "hidden", cls: "bg-ink/8 text-ink-3" },
};

export default async function StaffApartmentsPage() {
  const { t } = await getT();
  const supabase = await createClient();
  const { data: apartments } = await supabase
    .from("apartments")
    .select("id, slug, name, status, base_price, capacity, bedrooms")
    .order("created_at", { ascending: false });

  const ids = (apartments ?? []).map((a) => a.id);
  const { data: media } = ids.length
    ? await supabase
        .from("apartment_media")
        .select("apartment_id, storage_path, is_cover, position")
        .in("apartment_id", ids)
        .order("position")
    : { data: [] as { apartment_id: string; storage_path: string; is_cover: boolean }[] };

  const coverOf = (id: string) => {
    const list = (media ?? []).filter((m) => m.apartment_id === id);
    return (list.find((m) => m.is_cover) ?? list[0])?.storage_path ?? null;
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle
        title={t("console.title.appartements")}
        sub={t("console.sub.appartements")}
        action={<NewApartmentButton />}
      />

      {!apartments || apartments.length === 0 ? (
        <EmptyState
          title={t("console.empty.apartmentT")}
          body={t("console.empty.apartmentB")}
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {apartments.map((a) => {
            const cover = coverOf(a.id);
            const st = STATUS[a.status] ?? STATUS.draft;
            return (
              <li key={a.id}>
                <Link
                  href={`/staff/appartements/${a.id}`}
                  className="press group block overflow-hidden rounded-[var(--radius-lg)] border border-line bg-bone hover:border-ink/25"
                >
                  <div className="relative aspect-[16/10] bg-bone-2">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={aptImg(cover)} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-ink-3">
                        <Building2 className="h-6 w-6" />
                      </span>
                    )}
                    <span
                      className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-medium ${st.cls}`}
                    >
                      {st.key === "online"
                        ? t("console.aptEd.online")
                        : st.key === "draft"
                          ? t("console.status.draft")
                          : t("console.status.hidden")}
                    </span>
                  </div>
                  <div className="p-4">
                    <p className="text-[14px] font-medium text-ink">{a.name}</p>
                    <p className="mt-0.5 text-[12px] text-ink-3">
                      {a.capacity} pers · {a.bedrooms} ch ·{" "}
                      {a.base_price ? `${formatXOF(a.base_price)}/nuit` : "tarif à définir"}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
