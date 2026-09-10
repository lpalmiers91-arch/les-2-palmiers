"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Loader2 } from "lucide-react";
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

export function ArrivalSlip({ tone = "light" }: { tone?: "light" | "bare" }) {
  const router = useRouter();
  const { t } = useT();
  const { price } = useCurrency();

  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [guests, setGuests] = useState(2);
  const [apts, setApts] = useState<Apt[]>([]);
  const [result, setResult] = useState<{ available: number; minTotal: number; minNightly: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const seq = useRef(0);

  // dates par défaut : ~1 mois plus tard (fenêtre libre)
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

  const maxGuests = useMemo(
    () => Math.max(4, ...apts.map((a) => a.capacity || 0)),
    [apts],
  );
  const nights = useMemo(() => {
    if (!start || !end) return 0;
    const a = new Date(start).getTime();
    const b = new Date(end).getTime();
    if (Number.isNaN(a) || Number.isNaN(b)) return 0;
    return Math.max(0, Math.round((b - a) / 86_400_000));
  }, [start, end]);

  // quote de chaque appartement pour les dates choisies
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
          const minTotal = Math.min(...ok.map((q) => q.total));
          setResult({ available: ok.length, minTotal, minNightly: Math.round(minTotal / nights) });
        } else {
          setResult({ available: 0, minTotal: 0, minNightly: 0 });
        }
      } catch {
        if (id === seq.current) {
          const nightly = Math.min(...apts.map((a) => a.base_price));
          setResult({ available: apts.length, minTotal: nightly * nights, minNightly: nightly });
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

  const shell =
    tone === "bare"
      ? "bg-transparent"
      : "bg-bone text-ink shadow-[0_24px_60px_-24px_rgba(23,19,13,0.45)] ring-1 ring-ink/10";

  return (
    <form
      onSubmit={submit}
      className={`w-full max-w-sm rounded-[var(--radius-lg)] p-5 sm:p-6 ${shell}`}
      aria-label={t("arrival.title")}
    >
      <div className="flex items-baseline justify-between border-b border-ink/15 pb-3">
        <span className="display text-[15px] text-ink">{t("arrival.title")}</span>
        <span className="text-[12px] text-ink-3">
          {site.city} · {site.country}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Field label={t("arrival.arrival")}>
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
            className="slip-input"
          />
        </Field>
        <Field label={t("arrival.departure")}>
          <input
            type="date"
            value={end}
            min={start ? isoPlus(1) : isoPlus(2)}
            onChange={(e) => setEnd(e.target.value)}
            className="slip-input"
          />
        </Field>
      </div>

      <div className="mt-3">
        <Field label={t("arrival.guests")}>
          <div className="flex items-center justify-between">
            <span className="tnum text-[15px] text-ink">{guests}</span>
            <div className="flex gap-1.5">
              <StepBtn onClick={() => setGuests((g) => Math.max(1, g - 1))} label={t("arrival.guestMinus")}>
                −
              </StepBtn>
              <StepBtn
                onClick={() => setGuests((g) => Math.min(maxGuests, g + 1))}
                label={t("arrival.guestPlus")}
              >
                +
              </StepBtn>
            </div>
          </div>
        </Field>
      </div>

      <div className="mt-4 min-h-[62px] border-t border-dashed border-ink/25 pt-3">
        <AnimatePresence mode="wait" initial={false}>
          {nights < 1 ? (
            <motion.p key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[13px] text-ink-3">
              {t("arrival.pickDates")}
            </motion.p>
          ) : result === null || loading ? (
            <motion.p key="load" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-[13px] text-ink-3">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("arrival.checking")}
            </motion.p>
          ) : result.available > 0 ? (
            <motion.div
              key={`ok-${result.minTotal}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: easeOut }}
            >
              <p className="text-[13px] font-medium text-ok">
                {apts.length > 1
                  ? t("arrival.nAvailable", { n: result.available })
                  : t("arrival.oneAvailable")}
              </p>
              <p className="mt-1 flex items-baseline gap-1.5">
                <span className="text-[12px] text-ink-3">{t("arrival.fromLabel")}</span>
                <span className="tnum display text-[20px] text-ink">{price(result.minTotal)}</span>
                <span className="text-[12px] text-ink-3">{t("arrival.forNights", { nights })}</span>
              </p>
            </motion.div>
          ) : (
            <motion.p key="full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-[13px] text-ink-2">
              {t("arrival.fullDates")}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <button
        type="submit"
        disabled={nights < 1}
        className="press mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-[14px] font-medium text-bone transition-colors hover:bg-forest-2 disabled:opacity-40"
      >
        {t("arrival.checkAvailability")}
        <ArrowRight className="h-4 w-4" />
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block rounded-[10px] bg-bone-2/70 px-3 py-2">
      <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-ink-3">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function StepBtn({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="press flex h-7 w-7 items-center justify-center rounded-full border border-ink/20 text-[15px] leading-none text-ink hover:border-ink/45"
    >
      {children}
    </button>
  );
}
