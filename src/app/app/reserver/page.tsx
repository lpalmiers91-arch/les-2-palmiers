import { Suspense } from "react";
import type { Metadata } from "next";
import { PageTitle } from "@/components/app/ui";
import { ReservationFunnel } from "@/components/reserve/funnel";
import { getT } from "@/lib/i18n";

export const metadata: Metadata = { title: "Nouveau séjour" };

export default async function AppReservePage() {
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle title={t("appRes.newStay")} sub={t("booking.sub")} />
      <Suspense>
        <ReservationFunnel authed />
      </Suspense>
    </div>
  );
}
