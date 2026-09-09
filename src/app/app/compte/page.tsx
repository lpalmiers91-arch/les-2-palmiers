import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageTitle } from "@/components/app/ui";
import { AccountForm } from "@/components/app/account-form";

export const metadata: Metadata = { title: "Compte" };

export default async function ComptePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, locale")
    .eq("id", user!.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-xl">
      <PageTitle title="Votre compte" />
      <AccountForm
        initialName={profile?.full_name ?? ""}
        initialPhone={profile?.phone ?? ""}
        initialLocale={profile?.locale ?? "fr"}
        email={user!.email ?? ""}
      />
    </div>
  );
}
