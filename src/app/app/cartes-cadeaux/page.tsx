import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Gift } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageTitle } from "@/components/app/ui";
import { GiftCardPanel } from "@/components/app/gift-card-panel";
import { getT } from "@/lib/i18n";
import { formatXOF, formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Cartes cadeaux" };

const STATUS: Record<string, string> = {};

export default async function GiftCardsPage() {
  const { t } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: cfg } = await supabase
    .from("loyalty_settings")
    .select("enabled")
    .eq("id", 1)
    .maybeSingle();
  if (!cfg?.enabled) redirect("/app");

  const { data: cards } = await supabase
    .from("gift_cards")
    .select("id, code, amount, balance, status, recipient_email, created_at, activated_at")
    .or(`purchaser_id.eq.${user!.id},redeemed_by.eq.${user!.id}`)
    .order("created_at", { ascending: false });

  const rows = cards ?? [];
  void STATUS;

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title={t("giftCard.title")} sub={t("giftCard.sub")} />

      <GiftCardPanel />

      {rows.length > 0 && (
        <div className="mt-5 rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6">
          <h2 className="display text-[1.15rem] text-ink">{t("giftCard.myCards")}</h2>
          <ul className="mt-3 divide-y divide-line-soft text-[13.5px]">
            {rows.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="tnum font-medium text-ink">{c.code}</p>
                  <p className="text-[11.5px] text-ink-3">
                    {formatDate(c.created_at as string)}
                    {c.recipient_email ? ` · ${c.recipient_email}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="tnum text-[13px] text-ink">{formatXOF(c.balance as number)}</p>
                  <p className="text-[11px] text-ink-3">{t(`giftCard.status.${c.status}`)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 flex items-start gap-2 text-[12px] text-ink-3">
        <Gift className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t("giftCard.footNote")}
      </p>
    </div>
  );
}
