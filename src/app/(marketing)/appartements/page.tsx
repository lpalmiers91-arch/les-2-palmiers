import type { Metadata } from "next";
import { listApartments } from "@/lib/apartments";
import { ApartmentCard } from "@/components/marketing/apartment-card";
import { getT } from "@/lib/i18n";
import { pageMeta } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return pageMeta("/appartements", {
    title: "Nos appartements meublés à Cotonou — Les 2 Palmiers",
    description:
      "Les appartements meublés d'exception des 2 Palmiers à Cotonou — chacun avec sa fiche, sa galerie et sa réservation en ligne.",
  });
}

export default async function ApartmentsPage() {
  const { t } = await getT();
  const apts = await listApartments();

  return (
    <div className="bg-bone">
      <div className="mx-auto max-w-6xl px-5 pb-24 pt-[120px] md:px-8 md:pt-[150px]">
        <header className="max-w-2xl">
          <span className="eyebrow text-forest-2">{t("aptPub.eyebrow")}</span>
          <h1 className="display mt-3 text-[2.4rem] leading-[1.05] text-ink md:text-[3rem]">
            {t("aptPub.listTitle")}
          </h1>
          <p className="mt-4 text-[1.02rem] leading-relaxed text-ink-2">
            {t("aptPub.listLede")}
          </p>
        </header>

        {apts.length === 0 ? (
          <p className="mt-12 text-[14px] text-ink-3">{t("aptPub.none")}</p>
        ) : (
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {apts.map((apt) => (
              <ApartmentCard key={apt.id} apt={apt} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
