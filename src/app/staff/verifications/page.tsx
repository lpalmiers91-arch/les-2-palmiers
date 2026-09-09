import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageTitle } from "@/components/app/ui";
import { VerificationReview, type VerifRow } from "@/components/console/verification-review";

export const metadata: Metadata = { title: "Vérifications d'identité" };

export default async function StaffVerificationsPage() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("list_identity_verifications");
  const rows = (data ?? []) as VerifRow[];
  const pending = rows.filter((r) => r.status === "pending").length;

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle
        title="Vérifications d'identité"
        sub={
          pending > 0
            ? `${pending} dossier${pending > 1 ? "s" : ""} en attente de validation.`
            : "Validez ou refusez les pièces d'identité soumises par les clients."
        }
      />
      <VerificationReview rows={rows} />
    </div>
  );
}
