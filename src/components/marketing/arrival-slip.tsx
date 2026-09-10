"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { apartmentFallback } from "@/lib/site";
import { easeOut } from "@/lib/motion";
import { useT } from "@/lib/i18n/provider";
import { useCurrency } from "@/lib/currency";

function isoPlus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

type Quote = {
  nights: number;
  total: number;
  available: boolean;
  lodging_subtotal: number;
  cleaning_fee: number;
  discount_amount: number;
} | null;

export function ArrivalSlip({ tone = "light" }: { tone?: "light" | "bare" }) {
  const router = useRouter();
  const { t } = useT();
  const { price } = useCurrency();
  // état initial stable (SSR = client). Les dates réelles sont posées au montage.
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [guests, setGuests] = useState(2);

  useEffect(() => {
    setStart((s) => s || isoPlus(14));
    setEnd((e) => e || isoPlus(18));
  }, []);
  const [quote, setQuote] = useState<Quote>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const seq = useRef(0);

  const nights = useMemo(() => {
    if (!start || !end) return 0;
    const a = new Date(start).getTime();
    const b = new Date(end).getTime();
    if (Number.isNaN(a) || Number.isNaN(b)) return 0;
    return Math.max(0, Math.round((b - a) / 86_400_000));
  }, [start, end]);

  useEffect(() => {
    if (!start || !end) return;
    if (nights < 1) {
      setQuote(null);
      setErr(new Date(end) <= new Date(start) ? t("arrival.unavailable") : null);
      return;
    }
    setErr(null);
    const id = ++seq.current;
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const supabase = createClient();
        const { data: apt } = await supabase
          .from("apartments")
          .select("id")
          .eq("status", "published")
          .limit(1)
          .maybeSingle();
        if (!apt) throw new Error("indispo");
        const { data, error } = await supabase.rpc("quote_stay", {
          p_apartment: apt.id,
          p_range: `[${start},${end})`,
          p_guests: guests,
        });
        if (id !== seq.current) return;
        if (error) throw error;
        setQuote(data as Quote);
      } catch {
        if (id === seq.current) {
          // repli : estimation locale
          const sub = nights * apartmentFallback.base_price;
          setQuote({
            nights,
            lodging_subtotal: sub,
            cleaning_fee: apartmentFallback.cleaning_fee,
            discount_amount: 0,
            total: sub + apartmentFallback.cleaning_fee,
            available: true,
          });
        }
      } finally {
        if (id === seq.current) setLoading(false);
      }
    }, 320);
    return () => clearTimeout(timer);
  }, [start, end, guests, nights, t]);

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
      aria-label="Vérifier les disponibilités"
    >
      <div className="flex items-baseline justify-between border-b border-ink/15 pb-3">
        <span className="display text-[15px] text-ink">{t("arrival.title")}</span>
        <span className="text-[12px] text-ink-3">Cotonou · Bénin</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Field label={t("arrival.arrival")}>
          <input
            type="date"
            value={start}
            min={isoPlus(0)}
            onChange={(e) => setStart(e.target.value)}
            className="slip-input"
          />
        </Field>
        <Field label={t("arrival.departure")}>
          <input
            type="date"
            value={end}
            min={start}
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
              <StepBtn onClick={() => setGuests((g) => Math.max(1, g - 1))} label="Retirer un voyageur">
                −
              </StepBtn>
              <StepBtn onClick={() => setGuests((g) => Math.min(4, g + 1))} label="Ajouter un voyageur">
                +
              </StepBtn>
            </div>
          </div>
        </Field>
      </div>

      <div className="mt-4 min-h-[62px] border-t border-dashed border-ink/25 pt-3">
        <AnimatePresence mode="wait" initial={false}>
          {err ? (
            <motion.p
              key="err"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-[13px] text-danger"
            >
              {err}
            </motion.p>
          ) : quote && nights >= 1 ? (
            <motion.div
              key={`q-${quote.total}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: easeOut }}
            >
              <div className="flex items-baseline justify-between text-[13px] text-ink-3">
                <span>{t("arrival.nightsIncluded", { nights: quote.nights })}</span>
                {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              </div>
              <div className="mt-1 flex items-baseline justify-between">
                <span className="tnum display text-[22px] text-ink">
                  {price(quote.total)}
                </span>
                {quote.available ? (
                  <span className="text-[12px] font-medium text-ok">{t("arrival.available")}</span>
                ) : (
                  <span className="text-[12px] font-medium text-danger">{t("arrival.unavailable")}</span>
                )}
              </div>
            </motion.div>
          ) : (
            <p key="idle" className="text-[13px] text-ink-3">
              {t("arrival.checkAvailability")}
            </p>
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
      <span className="block text-[11px] font-medium uppercase tracking-[0.14em] text-ink-3">
        {label}
      </span>
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
