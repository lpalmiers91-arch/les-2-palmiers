import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageTitle } from "@/components/app/ui";
import { IdentityForm } from "@/components/app/identity-form";
import { getT } from "@/lib/i18n";

export const metadata: Metadata = { title: "Vérification d'identité" };

export default async function VerificationPage() {
  const { t } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: verif }] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name, date_of_birth, nationality")
      .eq("id", user!.id)
      .maybeSingle(),
    supabase
      .from("identity_verifications")
      .select("status")
      .eq("user_id", user!.id)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle
        title={t("appVerif.title")}
        sub={t("appVerif.sub")}
      />
      <div className="mt-6">
        <IdentityForm
          userId={user!.id}
          defaultName={profile?.full_name ?? ""}
          defaultDob={profile?.date_of_birth ?? ""}
          defaultNationality={profile?.nationality ?? ""}
          status={verif?.status ?? "none"}
        />
      </div>
    </div>
  );
}
