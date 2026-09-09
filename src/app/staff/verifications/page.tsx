import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageTitle } from "@/components/app/ui";
import { getT } from "@/lib/i18n";
import { VerificationReview, type VerifRow } from "@/components/console/verification-review";

export const metadata: Metadata = { title: "Vérifications d'identité" };

export default async function StaffVerificationsPage() {
  const { t } = await getT();
  const supabase = await createClient();
  const { data } = await supabase.rpc("list_identity_verifications");
  const rows = (data ?? []) as VerifRow[];
  const pending = rows.filter((r) => r.status === "pending").length;

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle
        title={t("console.title.verifications")}
        sub={
          pending > 0
            ? t("console.sub.verificationsPending", { count: pending })
            : t("console.sub.verifications")
        }
      />
      <VerificationReview rows={rows} />
    </div>
  );
}
