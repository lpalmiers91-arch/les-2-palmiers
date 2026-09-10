"use client";

import { useState } from "react";
import { Check, ChevronDown, Coins } from "lucide-react";
import { CURRENCIES } from "@/lib/money";
import { useCurrency } from "@/lib/currency";

export function CurrencySwitcher({ tone = "ink" }: { tone?: "ink" | "bone" }) {
  const { currency, setCurrency, enabled } = useCurrency();
  const [open, setOpen] = useState(false);
  if (!enabled) return null;

  const text = tone === "bone" ? "text-bone/80 hover:text-bone" : "text-ink-3 hover:text-ink";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Choisir la devise"
        className={`press flex items-center gap-1.5 text-[13px] font-medium transition-colors ${text}`}
      >
        <Coins className="h-4 w-4" />
        <span className="uppercase">{currency}</span>
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-44 overflow-hidden rounded-[12px] border border-line bg-bone py-1 shadow-[0_20px_50px_-18px_rgba(23,19,13,0.35)]">
            {CURRENCIES.map((c) => (
              <button
                key={c.code}
                onClick={() => {
                  setCurrency(c.code);
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] text-ink-2 hover:bg-ink/5"
              >
                <span>
                  <span className="font-medium">{c.code}</span>{" "}
                  <span className="text-ink-3">{c.symbol}</span>
                </span>
                {c.code === currency && <Check className="h-3.5 w-3.5 text-forest-2" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
