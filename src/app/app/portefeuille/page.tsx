import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageTitle } from "@/components/app/ui";
import { WalletPanel, type LedgerEntry } from "@/components/app/wallet-panel";
import { getT } from "@/lib/i18n";

export const metadata: Metadata = { title: "Mon compte" };

export default async function WalletPage() {
  const { t } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: bal }, { data: ledger }] = await Promise.all([
    supabase.rpc("wallet_balance", { p_user: user!.id }),
    supabase
      .from("wallet_ledger")
      .select("id, kind, amount, balance_after, note, created_at")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const rows: LedgerEntry[] = (ledger ?? []).map((e) => ({
    id: e.id as string,
    kind: e.kind as string,
    amount: Number(e.amount),
    balance_after: Number(e.balance_after),
    note: (e.note as string | null) ?? null,
    created_at: e.created_at as string,
  }));

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title={t("wallet.title")} sub={t("wallet.sub")} />
      <WalletPanel userId={user!.id} balance={Number(bal ?? 0)} ledger={rows} />
    </div>
  );
}
