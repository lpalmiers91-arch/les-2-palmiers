import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageTitle } from "@/components/app/ui";
import {
  LoyaltySettingsForm,
  type LoyaltySettings,
} from "@/components/console/loyalty-settings-form";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Fidélité" };

export default async function StaffLoyalty() {
  const supabase = await createClient();
  const [{ data: settings }, { data: accounts }] = await Promise.all([
    supabase.from("loyalty_settings").select("*").eq("id", 1).maybeSingle(),
    supabase
      .from("loyalty_accounts")
      .select("points, lifetime_points, tier, updated_at, client:profiles!loyalty_accounts_client_id_fkey(full_name)")
      .order("points", { ascending: false })
      .limit(30),
  ]);

  const initial: LoyaltySettings = {
    enabled: settings?.enabled ?? true,
    currency_per_point: Number(settings?.currency_per_point ?? 1000),
    signup_bonus: settings?.signup_bonus ?? 100,
    review_bonus: settings?.review_bonus ?? 50,
    tiers: Array.isArray(settings?.tiers)
      ? (settings!.tiers as { name: string; min_points: number; perk: string }[])
      : [],
  };

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title="Fidélité" sub="Barème de points, bonus et paliers." />
      <LoyaltySettingsForm initial={initial} />

      {accounts && accounts.length > 0 && (
        <section className="mt-8">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
            Comptes clients
          </h2>
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-bone">
            {accounts.map((a, i) => (
              <li key={i} className="flex items-center justify-between gap-3 px-5 py-3 text-[13px]">
                <div>
                  <p className="text-ink">
                    {(a.client as { full_name?: string } | null)?.full_name ?? "Client"}
                  </p>
                  <p className="text-[11.5px] text-ink-3">
                    {a.tier} · maj {formatDate(a.updated_at as string)}
                  </p>
                </div>
                <span className="tnum text-[13px] font-medium text-ink">
                  {a.points} pts
                  <span className="ml-1 text-[11px] font-normal text-ink-3">
                    ({a.lifetime_points} cumulés)
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
