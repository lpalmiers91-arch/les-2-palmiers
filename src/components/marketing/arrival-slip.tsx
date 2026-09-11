"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Loader2, Minus, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { easeOut } from "@/lib/motion";
import { useT } from "@/lib/i18n/provider";
import { useCurrency } from "@/lib/currency";

function isoPlus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

type Apt = { id: string; base_price: number; capacity: number };
type Result = { available: number; total: number } | null;

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
        setResult(
          ok.length > 0
            ? { available: ok.length, total: Math.min(...ok.map((q) => q.total)) }
            : { available: 0, total: 0 },
        );
      } catch {
        if (id === seq.current) {
          const nightly = Math.min(...apts.map((a) => a.base_price));
          setResult({ available: apts.length, total: nightly * nights });
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

  const onStartChange = (v: string) => {
    setStart(v);
    if (end && new Date(end) <= new Date(v)) {
      const d = new Date(v);
      d.setDate(d.getDate() + 3);
      setEnd(d.toISOString().slice(0, 10));
    }
  };

  return (
    <div className="w-full">
      {/* ligne de disponibilité, sur l'image */}
      <div className="mb-2.5 flex min-h-[20px] items-center px-1">
        <AnimatePresence mode="wait" initial={false}>
          {nights < 1 ? (
            <motion.span key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[12.5px] text-bone/70">
              {t("arrival.pickDates")}
            </motion.span>
          ) : result === null || loading ? (
            <motion.span key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-1.5 text-[12.5px] text-bone/70">
              <Loader2 className="h-3 w-3 animate-spin" /> {t("arrival.checking")}
            </motion.span>
          ) : result.available > 0 ? (
            <motion.span
              key={`ok-${result.total}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: easeOut }}
              className="flex items-center gap-2 text-[12.5px] text-bone/90"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-sand" />
              {result.available > 1
                ? t("arrival.nAvailable", { n: result.available })
                : t("arrival.oneAvailable")}
              <span className="text-bone/50">·</span>
              <span>
                {t("arrival.fromLabel")} <span className="tnum font-semibold text-bone">{price(result.total)}</span>
              </span>
            </motion.span>
          ) : (
            <motion.span key="full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[12.5px] text-bone/75">
              {t("arrival.fullDates")}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* barre de réservation */}
      <form
        onSubmit={submit}
        aria-label={t("arrival.title")}
        className="rounded-[20px] bg-bone p-2 shadow-[0_24px_60px_-20px_rgba(10,14,11,0.6)] ring-1 ring-ink/[0.05] sm:flex sm:items-stretch sm:gap-1.5 sm:p-2"
      >
        {/* dates */}
        <div className="grid grid-cols-2 sm:flex sm:flex-1">
          <label className="flex flex-col gap-0.5 rounded-[13px] px-4 py-2.5 transition-colors focus-within:bg-bone-2/70 sm:flex-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">{t("arrival.arrival")}</span>
            <input type="date" value={start} min={isoPlus(1)} onChange={(e) => onStartChange(e.target.value)} className="slip-input text-[13.5px] font-medium" />
          </label>
          <label className="flex flex-col gap-0.5 rounded-[13px] border-l border-ink/10 px-4 py-2.5 transition-colors focus-within:bg-bone-2/70 sm:flex-1">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">{t("arrival.departure")}</span>
            <input type="date" value={end} min={isoPlus(2)} onChange={(e) => setEnd(e.target.value)} className="slip-input text-[13.5px] font-medium" />
          </label>
        </div>

        {/* voyageurs */}
        <div className="flex items-center justify-between gap-2 rounded-[13px] border-t border-ink/10 px-4 py-2.5 sm:border-l sm:border-t-0 sm:min-w-[150px]">
          <span className="flex flex-col gap-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">{t("arrival.guests")}</span>
            <span className="tnum text-[13.5px] font-medium text-ink">{guests}</span>
          </span>
          <span className="flex items-center gap-1.5">
            <Step onClick={() => setGuests((g) => Math.max(1, g - 1))} disabled={guests <= 1} label={t("arrival.guestMinus")}>
              <Minus className="h-3.5 w-3.5" />
            </Step>
            <Step onClick={() => setGuests((g) => Math.min(maxGuests, g + 1))} disabled={guests >= maxGuests} label={t("arrival.guestPlus")}>
              <Plus className="h-3.5 w-3.5" />
            </Step>
          </span>
        </div>

        {/* CTA */}
        <button
          type="submit"
          disabled={nights < 1}
          className="press mt-1.5 flex h-12 items-center justify-center gap-2 whitespace-nowrap rounded-[14px] bg-brass px-6 text-[13.5px] font-medium text-bone transition-colors hover:bg-brass-2 disabled:opacity-40 sm:mt-0 sm:h-auto sm:self-stretch sm:px-5"
        >
          {t("arrival.checkAvailability")}
          <ArrowRight className="h-4 w-4 shrink-0" />
        </button>
      </form>
    </div>
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
