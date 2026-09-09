import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ContractPanel } from "@/components/app/contract-panel";

export const metadata: Metadata = { title: "Contrat de séjour", robots: { index: false } };

export default async function ContractPage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const supabase = await createClient();

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
    <ContractPanel
      contract={contract as never}
      client={{
        name: profile?.full_name ?? "",
        address: [profile?.address, profile?.city, profile?.country].filter(Boolean).join(", "),
        phone: profile?.phone ?? "",
      }}
      canSign={contract.client_id === user.id}
    />
  );
}
