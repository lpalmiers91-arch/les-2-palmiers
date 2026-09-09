"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Gift } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatXOF } from "@/lib/format";

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
      setErr(/not_enough/.test(error.message) ? "Points insuffisants." : "Échange impossible.");
      return;
    }
    setDone(true);
    router.refresh();
    setTimeout(() => setDone(false), 2500);
  }

  const canRedeem = points >= minRedeem;

  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6">
      <h2 className="display text-[1.15rem] text-ink">Échanger mes points</h2>
      <p className="mt-1 text-[13px] text-ink-3">
        1 point = {formatXOF(redeemPerPoint)} de crédit, appliqué automatiquement à votre prochain
        paiement. Minimum {minRedeem} points.
      </p>

      {creditXof > 0 && (
        <p className="mt-3 flex items-center gap-2 rounded-[10px] bg-bone-2 px-3 py-2 text-[13px] text-ink">
          <Gift className="h-4 w-4 text-brass-2" />
          Crédit disponible : <span className="font-medium">{formatXOF(creditXof)}</span>
        </p>
      )}

      {!canRedeem ? (
        <p className="mt-4 text-[13px] text-ink-3">
          Il vous faut au moins {minRedeem} points pour échanger. Continuez à réserver et à laisser
          des avis.
        </p>
      ) : (
        <div className="mt-4">
          <div className="flex items-center justify-between text-[13px] text-ink-2">
            <span>{amount} points</span>
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
              {done ? "Crédit ajouté" : "Échanger"}
            </button>
          </div>
          {err && <p className="mt-2 text-[12.5px] text-danger">{err}</p>}
        </div>
      )}
    </div>
  );
}
