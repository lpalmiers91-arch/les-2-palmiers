import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageTitle, EmptyState } from "@/components/app/ui";
import { getT } from "@/lib/i18n";
import { StayInfoForm, type StayInfo } from "@/components/console/stay-info-form";

export const metadata: Metadata = { title: "Infos séjour" };

export default async function StaffStayInfo() {
  const { t } = await getT();
  const supabase = await createClient();
  const { data: apartments } = await supabase
    .from("apartments")
    .select("id, name")
    .order("created_at");

  const ids = (apartments ?? []).map((a) => a.id);
  const { data: infos } = ids.length
    ? await supabase.from("stay_info").select("*").in("apartment_id", ids)
    : { data: [] as Record<string, unknown>[] };
  const byApt = new Map((infos ?? []).map((i) => [i.apartment_id as string, i]));

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title={t("console.title.sejour")} sub={t("console.sub.sejour")} />
      {!apartments || apartments.length === 0 ? (
        <EmptyState title={t("console.empty.apartmentT")} body={t("console.empty.apartmentB")} />
      ) : (
        <div className="space-y-6">
          {apartments.map((a) => {
            const i = byApt.get(a.id) as Record<string, unknown> | undefined;
            const initial: StayInfo = {
              apartment_id: a.id,
              wifi_ssid: (i?.wifi_ssid as string) ?? "",
              wifi_password: (i?.wifi_password as string) ?? "",
              house_manual: (i?.house_manual as string) ?? "",
              checkin_notes: (i?.checkin_notes as string) ?? "",
              checkout_notes: (i?.checkout_notes as string) ?? "",
              emergency_contact: (i?.emergency_contact as string) ?? "",
              extras: Array.isArray(i?.extras) ? (i!.extras as { label: string; value: string }[]) : [],
            };
            return <StayInfoForm key={a.id} apartmentName={a.name} initial={initial} />;
          })}
        </div>
      )}
    </div>
  );
}
