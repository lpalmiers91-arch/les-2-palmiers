import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Users, Check, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageTitle } from "@/components/app/ui";
import { ReferralShare } from "@/components/app/referral-share";
import { getT } from "@/lib/i18n";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Parrainage" };

export default async function ReferralPage() {
  const { t } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: cfg } = await supabase
    .from("loyalty_settings")
    .select("enabled, referral_referrer_points, referral_referred_points")
    .eq("id", 1)
    .maybeSingle();
  if (!cfg?.enabled) redirect("/app");

  const { data: code } = await supabase.rpc("my_referral_code");

  const { data: referrals } = await supabase
    .from("referrals")
    .select("id, status, created_at, qualified_at, referred:profiles!referrals_referred_id_fkey(full_name)")
    .eq("referrer_id", user!.id)
    .order("created_at", { ascending: false });

  const rows = referrals ?? [];
  const qualified = rows.filter((r) => r.status === "qualified").length;

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title={t("referral.title")} sub={t("referral.sub")} />

      <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-6">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest/10 text-forest-2">
            <Users className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[14.5px] font-medium text-ink">
              {t("referral.reward", {
                referrer: cfg.referral_referrer_points ?? 500,
                referred: cfg.referral_referred_points ?? 300,
              })}
            </p>
            <p className="mt-0.5 text-[13px] text-ink-3">{t("referral.howItWorks")}</p>
          </div>
        </div>

        <div className="mt-5">
          <ReferralShare code={(code as string) ?? ""} />
        </div>
      </div>

      <div className="mt-5 rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6">
        <div className="flex items-baseline justify-between">
          <h2 className="display text-[1.15rem] text-ink">{t("referral.myReferrals")}</h2>
          <span className="tnum text-[13px] text-ink-3">
            {t("referral.qualifiedCount", { n: qualified, total: rows.length })}
          </span>
        </div>
        {rows.length === 0 ? (
          <p className="mt-3 text-[13px] text-ink-3">{t("referral.none")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-line-soft text-[13.5px]">
            {rows.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-ink">
                    {(r.referred as { full_name?: string } | null)?.full_name ?? t("referral.aFriend")}
                  </p>
                  <p className="text-[11.5px] text-ink-3">{formatDate(r.created_at as string)}</p>
                </div>
                {r.status === "qualified" ? (
                  <span className="inline-flex items-center gap-1 text-[12px] font-medium text-forest-2">
                    <Check className="h-3.5 w-3.5" /> {t("referral.qualified")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[12px] text-ink-3">
                    <Clock className="h-3.5 w-3.5" /> {t("referral.pending")}
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
