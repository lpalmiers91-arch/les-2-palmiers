"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Loader2, Minus, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { site } from "@/lib/site";
import { easeOut } from "@/lib/motion";
import { useT } from "@/lib/i18n/provider";
import { useCurrency } from "@/lib/currency";

function isoPlus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

type Apt = { id: string; base_price: number; capacity: number };
type Result = { available: number; total: number; nightly: number } | null;

export function ArrivalSlip() {
  const router = useRouter();
  const { t } = useT();
  const { price } = useCurrency();

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [guests, setGuests] = useState(2);
  const [apts, setApts] = useState<Apt[]>([]);
  const [result, setResult] = useState<Result>(null);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    setStart((s) => s || isoPlus(30));
    setEnd((e) => e || isoPlus(34));
  }, []);

  useEffect(() => {
    createClient()
      .from("apartments")
      .select("id, base_price, capacity")
      .eq("status", "published")
      .order("base_price")
      .then(({ data }) => setApts((data ?? []) as Apt[]));
  }, []);

  const maxGuests = useMemo(() => Math.max(4, ...apts.map((a) => a.capacity || 0)), [apts]);
  const nights = useMemo(() => {
    if (!start || !end) return 0;
    const a = new Date(start).getTime();
    const b = new Date(end).getTime();
    if (Number.isNaN(a) || Number.isNaN(b)) return 0;
    return Math.max(0, Math.round((b - a) / 86_400_000));
  }, [start, end]);

  useEffect(() => {
    if (!start || !end || nights < 1 || apts.length === 0) {
      setResult(null);
      return;
    }
    const id = ++seq.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const supabase = createClient();
        const quotes = await Promise.all(
          apts.map((a) =>
            supabase
              .rpc("quote_stay", { p_apartment: a.id, p_range: `[${start},${end})`, p_guests: guests })
              .then(({ data }) => data as { available?: boolean; total?: number } | null),
          ),
        );
        if (id !== seq.current) return;
        const ok = quotes.filter((q) => q?.available && typeof q.total === "number") as { total: number }[];
        if (ok.length > 0) {
          const total = Math.min(...ok.map((q) => q.total));
          setResult({ available: ok.length, total, nightly: Math.round(total / nights) });
        } else {
          setResult({ available: 0, total: 0, nightly: 0 });
        }
      } catch {
        if (id === seq.current) {
          const nightly = Math.min(...apts.map((a) => a.base_price));
          setResult({ available: apts.length, total: nightly * nights, nightly });
        }
      } finally {
        if (id === seq.current) setLoading(false);
      }
    }, 320);
    return () => clearTimeout(timer);
  }, [start, end, guests, nights, apts]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (nights < 1) return;
    const p = new URLSearchParams({ start, end, guests: String(guests) });
    router.push(`/reserver?${p.toString()}`);
  }

  return (
    <form
      onSubmit={submit}
      aria-label={t("arrival.title")}
      className="w-full max-w-[380px] rounded-[22px] bg-bone p-2 text-ink shadow-[0_30px_70px_-28px_rgba(15,20,17,0.55)] ring-1 ring-ink/[0.06]"
    >
      <div className="flex items-baseline justify-between px-3.5 pb-2.5 pt-3">
        <span className="display text-[15px] text-ink">{t("arrival.title")}</span>
        <span className="text-[11.5px] text-ink-3">
          {site.city} · {site.country}
        </span>
      </div>

      {/* dates : deux colonnes séparées par un filet */}
      <div className="grid grid-cols-2 overflow-hidden rounded-[15px] bg-bone-2/60">
        <label className="group flex flex-col gap-1 px-3.5 py-3 transition-colors focus-within:bg-bone">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">
            {t("arrival.arrival")}
          </span>
          <input
            type="date"
            value={start}
            min={isoPlus(1)}
            onChange={(e) => {
              setStart(e.target.value);
              if (end && new Date(end) <= new Date(e.target.value)) {
                const d = new Date(e.target.value);
                d.setDate(d.getDate() + 3);
                setEnd(d.toISOString().slice(0, 10));
              }
            }}
            className="slip-input text-[13.5px] font-medium"
          />
        </label>
        <label className="flex flex-col gap-1 border-l border-ink/10 px-3.5 py-3 transition-colors focus-within:bg-bone">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">
            {t("arrival.departure")}
          </span>
          <input
            type="date"
            value={end}
            min={start ? isoPlus(2) : isoPlus(2)}
            onChange={(e) => setEnd(e.target.value)}
            className="slip-input text-[13.5px] font-medium"
          />
        </label>
      </div>

      {/* voyageurs */}
      <div className="mt-1.5 flex items-center justify-between rounded-[15px] bg-bone-2/60 px-3.5 py-2.5">
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">
            {t("arrival.guests")}
          </span>
          <span className="tnum text-[13.5px] font-medium text-ink">{guests}</span>
        </div>
        <div className="flex items-center gap-2">
          <Step onClick={() => setGuests((g) => Math.max(1, g - 1))} disabled={guests <= 1} label={t("arrival.guestMinus")}>
            <Minus className="h-3.5 w-3.5" />
          </Step>
          <Step
            onClick={() => setGuests((g) => Math.min(maxGuests, g + 1))}
            disabled={guests >= maxGuests}
            label={t("arrival.guestPlus")}
          >
            <Plus className="h-3.5 w-3.5" />
          </Step>
        </div>
      </div>

      {/* résultat */}
      <div className="flex min-h-[46px] items-center px-3.5 py-2.5">
        <AnimatePresence mode="wait" initial={false}>
          {nights < 1 ? (
            <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[12.5px] text-ink-3">
              {t("arrival.pickDates")}
            </motion.p>
          ) : result === null || loading ? (
            <motion.p key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-[12.5px] text-ink-3">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("arrival.checking")}
            </motion.p>
          ) : result.available > 0 ? (
            <motion.div
              key={`ok-${result.total}`}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28, ease: easeOut }}
              className="flex w-full items-center justify-between"
            >
              <span className="flex items-center gap-1.5 text-[12.5px] font-medium text-forest-2">
                <span className="h-1.5 w-1.5 rounded-full bg-forest-2" />
                {apts.length > 1 ? t("arrival.nAvailable", { n: result.available }) : t("arrival.oneAvailable")}
              </span>
              <span className="text-[12.5px] text-ink-3">
                {t("arrival.fromLabel")}{" "}
                <span className="tnum font-semibold text-ink">{price(result.total)}</span>
              </span>
            </motion.div>
          ) : (
            <motion.p key="full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[12.5px] text-ink-2">
              {t("arrival.fullDates")}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <button
        type="submit"
        disabled={nights < 1}
        className="press flex h-12 w-full items-center justify-center gap-2 rounded-[15px] bg-ink text-[13.5px] font-medium text-bone transition-colors hover:bg-forest-2 disabled:opacity-40"
      >
        {t("arrival.checkAvailability")}
        <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}

function Step({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="press flex h-8 w-8 items-center justify-center rounded-full border border-ink/15 text-ink transition-colors hover:border-ink/40 disabled:opacity-30 disabled:hover:border-ink/15"
    >
      {children}
    </button>
  );
}
