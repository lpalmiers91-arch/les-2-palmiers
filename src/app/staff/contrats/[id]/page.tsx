import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ContractEditor } from "@/components/console/contract-editor";

export const metadata: Metadata = { title: "Contrat" };

export default async function StaffContractDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: c } = await supabase
    .from("contracts")
    .select(
      "id, reference, status, terms, client_signed_at, countersigned_at, client:profiles!contracts_client_id_fkey(full_name)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!c) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/staff/contrats"
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Tous les contrats
      </Link>
      <h1 className="display mt-3 text-[1.7rem] text-ink sm:text-[2rem]">
        Contrat {c.reference}
      </h1>
      <div className="mt-6">
        <ContractEditor
          contractId={c.id}
          reference={c.reference}
          status={c.status}
          initialTerms={(c.terms ?? {}) as Record<string, unknown>}
          clientName={(c.client as { full_name?: string } | null)?.full_name ?? "Client"}
          clientSignedAt={c.client_signed_at}
          countersignedAt={c.countersigned_at}
        />
      </div>
    </div>
  );
}
