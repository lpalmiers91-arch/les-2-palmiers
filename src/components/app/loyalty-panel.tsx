"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Gift } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatXOF } from "@/lib/format";
import { useT } from "@/lib/i18n/provider";

export function RedeemPanel({
  points,
  creditXof,
  redeemPerPoint,
  minRedeem,
}: {
  points: number;
  creditXof: number;
  redeemPerPoint: number;
  minRedeem: number;
}) {
  const router = useRouter();
  const { t } = useT();
  const step = Math.max(minRedeem, 50);
  const max = Math.floor(points / step) * step;
  const [amount, setAmount] = useState(max >= minRedeem ? Math.min(max, step) : 0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function redeem() {
    setBusy(true);
    setErr(null);
    const { error } = await createClient().rpc("redeem_loyalty", { p_points: amount });
    setBusy(false);
    if (error) {
      setErr(/not_enough/.test(error.message) ? t("loyaltyPage.notEnough") : t("loyaltyPage.redeemFailed"));
      return;
    }
    setDone(true);
    router.refresh();
    setTimeout(() => setDone(false), 2500);
  }

  const canRedeem = points >= minRedeem;

  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6">
      <h2 className="display text-[1.15rem] text-ink">{t("loyaltyPage.redeemTitle")}</h2>
      <p className="mt-1 text-[13px] text-ink-3">
        {t("loyaltyPage.redeemHelp",{value:formatXOF(redeemPerPoint),min:minRedeem})}
      </p>

      {creditXof > 0 && (
        <p className="mt-3 flex items-center gap-2 rounded-[10px] bg-bone-2 px-3 py-2 text-[13px] text-ink">
          <Gift className="h-4 w-4 text-brass-2" />
          {t("loyaltyPage.creditAvailable")} <span className="font-medium">{formatXOF(creditXof)}</span>
        </p>
      )}

      {!canRedeem ? (
        <p className="mt-4 text-[13px] text-ink-3">
          {t("loyaltyPage.needMore",{min:minRedeem})}
        </p>
      ) : (
        <div className="mt-4">
          <div className="flex items-center justify-between text-[13px] text-ink-2">
            <span>{t("loyaltyPage.pointsN",{n:amount})}</span>
            <span className="font-medium text-ink">{formatXOF(amount * redeemPerPoint)}</span>
          </div>
          <input
            type="range"
            min={step}
            max={max}
            step={step}
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            className="mt-2 w-full accent-forest"
          />
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={redeem}
              disabled={busy || amount < minRedeem}
              className="press flex h-10 items-center justify-center gap-2 rounded-full bg-ink px-5 text-[13px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : done ? (
                <Check className="h-4 w-4" />
              ) : null}
              {done ? t("loyaltyPage.creditAdded") : t("loyaltyPage.redeem")}
            </button>
          </div>
          {err && <p className="mt-2 text-[12.5px] text-danger">{err}</p>}
        </div>
      )}
    </div>
  );
}
