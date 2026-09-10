import type { Metadata } from "next";
import { PageTitle } from "@/components/app/ui";
import { ApartmentCard } from "@/components/marketing/apartment-card";
import { listApartments } from "@/lib/apartments";
import { getT } from "@/lib/i18n";

export const metadata: Metadata = { title: "Appartements" };

export default async function AppApartmentsPage() {
  const { t } = await getT();
  const apts = await listApartments();

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle title={t("aptPub.listTitle")} sub={t("aptPub.listLede")} />
      {apts.length === 0 ? (
        <p className="rounded-[var(--radius-lg)] border border-line bg-bone p-8 text-center text-[14px] text-ink-3">
          {t("aptPub.none")}
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {apts.map((a) => (
            <ApartmentCard key={a.id} apt={a} href={`/app/appartements/${a.slug}`} />
          ))}
        </div>
      )}
    </div>
  );
}
