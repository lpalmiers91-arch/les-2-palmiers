import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ContractPanel } from "@/components/app/contract-panel";
import { RowRefresh } from "@/components/realtime/row-refresh";
import { I18nProvider } from "@/lib/i18n/provider";
import { getLocale, getMessages } from "@/lib/i18n";

export const metadata: Metadata = { title: "Contrat de séjour", robots: { index: false } };

export default async function ContractPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const supabase = await createClient();
  const locale = await getLocale();
  const messages = await getMessages(locale);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?suite=/contrat/${ref}`);

  const { data: contract } = await supabase
    .from("contracts")
    .select(
      "id, reference, status, terms, client_signature_name, client_signed_at, staff_signature_name, countersigned_at, client_id",
    )
    .eq("reference", decodeURIComponent(ref))
    .maybeSingle();

  if (!contract) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, address, city, country, phone")
    .eq("id", contract.client_id)
    .maybeSingle();

  return (
    <I18nProvider locale={locale} messages={messages}>
      <RowRefresh table="contracts" value={contract.id} />
      <ContractPanel
        contract={contract as never}
        client={{
          name: profile?.full_name ?? "",
          address: [profile?.address, profile?.city, profile?.country].filter(Boolean).join(", "),
          phone: profile?.phone ?? "",
        }}
        canSign={contract.client_id === user.id}
      />
    </I18nProvider>
  );
}
