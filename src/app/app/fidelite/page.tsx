import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Gift, Star, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageTitle } from "@/components/app/ui";
import { RedeemPanel } from "@/components/app/loyalty-panel";
import { getT } from "@/lib/i18n";
import { formatXOF, formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Fidélité" };

function reasonLabel(t: (k: string) => string, r: string) {
  const map: Record<string, string> = {
    signup: t("loyaltyPage.rSignup"), reservation: t("loyaltyPage.rReservation"),
    payment: t("loyaltyPage.rPayment"), review: t("loyaltyPage.rReview"),
    redeem: t("loyaltyPage.rRedeem"), credit_used: t("loyaltyPage.rCreditUsed"),
    referral: t("loyaltyPage.rReferral"), gift_card: t("loyaltyPage.rGiftCard"),
    manual: t("loyaltyPage.rManual"),
  };
  return map[r] ?? r;
}

export default async function LoyaltyPage() {
  const { t } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uid = user!.id;

  const [{ data: cfg }, { data: acc }, { data: ledger }] = await Promise.all([
    supabase
      .from("loyalty_settings")
      .select("enabled, currency_per_point, signup_bonus, review_bonus, redeem_per_point, min_redeem, tiers")
      .eq("id", 1)
      .maybeSingle(),
    supabase
      .from("loyalty_accounts")
      .select("points, lifetime_points, tier, credit_xof")
      .eq("client_id", uid)
      .maybeSingle(),
    supabase
      .from("loyalty_ledger")
      .select("id, delta, reason, note, created_at")
      .eq("client_id", uid)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  if (!cfg?.enabled) redirect("/app");

  const points = acc?.points ?? 0;
  const tiers = (Array.isArray(cfg.tiers) ? cfg.tiers : []) as {
    name: string;
    min_points: number;
    perk?: string;
  }[];
  const sorted = [...tiers].sort((a, b) => a.min_points - b.min_points);
  const currentTier = acc?.tier ?? sorted[0]?.name ?? t("loyaltyPage.tier0");
  const nextTier = sorted.find((x) => x.min_points > points);
  const progress = nextTier
    ? Math.min(100, Math.round((points / nextTier.min_points) * 100))
    : 100;

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title={t("loyaltyPage.title")} sub={t("loyaltyPage.sub")} />

      <div className="rounded-[var(--radius-lg)] border border-line bg-forest p-6 text-bone">
        <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.14em] text-bone/60">
          <Gift className="h-4 w-4" /> {t("loyaltyPage.tierLabel")} {currentTier}
        </div>
        <p className="tnum mt-2 text-[2.6rem] font-medium leading-none">
          {points}
          <span className="ml-2 text-[14px] font-normal text-bone/60">{t("loyaltyPage.points")}</span>
        </p>
        <p className="mt-1 text-[12.5px] text-bone/60">
          {t("loyaltyPage.lifetime",{n:acc?.lifetime_points ?? 0})}
        </p>
        {(acc?.credit_xof ?? 0) > 0 && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-bone/10 px-3 py-1 text-[13px]">
            <Sparkles className="h-3.5 w-3.5" /> {t("loyaltyPage.credit")} {formatXOF(acc!.credit_xof)}
          </p>
        )}
        {nextTier && (
          <div className="mt-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-bone/15">
              <div className="h-full rounded-full bg-brass" style={{ width: `${progress}%` }} />
            </div>
            <p className="mt-1.5 text-[12px] text-bone/60">
              {t("loyaltyPage.pointsBefore",{n:nextTier.min_points - points,name:nextTier.name})}
            </p>
          </div>
        )}
      </div>

      <div className="mt-5">
        <RedeemPanel
          points={points}
          creditXof={acc?.credit_xof ?? 0}
          redeemPerPoint={cfg.redeem_per_point ?? 100}
          minRedeem={cfg.min_redeem ?? 100}
        />
      </div>

      {sorted.length > 0 && (
        <div className="mt-5 rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6">
          <h2 className="display text-[1.15rem] text-ink">{t("loyaltyPage.tiers")}</h2>
          <ul className="mt-3 space-y-2.5">
            {sorted.map((tier) => {
              const reached = points >= tier.min_points;
              return (
                <li
                  key={tier.name}
                  className={`flex items-start gap-3 rounded-[10px] border px-3 py-2.5 ${
                    reached ? "border-forest/30 bg-forest/[0.04]" : "border-line"
                  }`}
                >
                  <Star
                    className={`mt-0.5 h-4 w-4 shrink-0 ${reached ? "fill-brass text-brass" : "text-line"}`}
                  />
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-medium text-ink">
                      {tier.name}{" "}
                      <span className="font-normal text-ink-3">· {t("loyaltyPage.fromPts",{n:tier.min_points})}</span>
                    </p>
                    {tier.perk && <p className="text-[12.5px] text-ink-3">{tier.perk}</p>}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-5 rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6">
        <h2 className="display text-[1.15rem] text-ink">{t("loyaltyPage.history")}</h2>
        {!ledger || ledger.length === 0 ? (
          <p className="mt-2 text-[13px] text-ink-3">{t("loyaltyPage.noHistory")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-line-soft text-[13px]">
            {ledger.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-ink">{reasonLabel(t, row.reason)}</p>
                  <p className="text-[11.5px] text-ink-3">
                    {formatDate(row.created_at as string)}
                    {row.note ? ` · ${row.note}` : ""}
                  </p>
                </div>
                {row.delta !== 0 && (
                  <span
                    className={`tnum shrink-0 font-medium ${
                      row.delta > 0 ? "text-forest-2" : "text-ink-3"
                    }`}
                  >
                    {row.delta > 0 ? "+" : ""}
                    {row.delta}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
