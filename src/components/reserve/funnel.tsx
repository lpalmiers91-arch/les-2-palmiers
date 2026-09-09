"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatXOF, formatDate, nightsBetween } from "@/lib/format";
import { aptImg } from "@/lib/site";

type Quote = {
  nights: number;
  lodging_subtotal: number;
  cleaning_fee: number;
  discount_amount: number;
  discount_percent: number;
  total: number;
  available: boolean;
  over_capacity: boolean;
  meets_min_nights: boolean;
  min_nights: number;
} | null;

function iso(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export function ReservationFunnel({ authed }: { authed: boolean }) {
  const router = useRouter();
  const params = useSearchParams();

  const [start, setStart] = useState(params.get("start") || "");
  const [end, setEnd] = useState(params.get("end") || "");
  const [guests, setGuests] = useState(Number(params.get("guests")) || 2);
  const [deposit, setDeposit] = useState<50 | 100>(50);
  const [quote, setQuote] = useState<Quote>(null);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  useEffect(() => {
    if (!start) setStart(iso(14));
    if (!end) setEnd(iso(18));
  }, [start, end]);

  const nights = useMemo(
    () => (start && end ? nightsBetween(start, end) : 0),
    [start, end],
  );

  useEffect(() => {
    if (!start || !end || nights < 1) {
      setQuote(null);
      return;
    }
    const id = ++seq.current;
    setQuoting(true);
    const t = setTimeout(async () => {
      const supabase = createClient();
      const { data: apt } = await supabase
        .from("apartments").select("id").eq("status", "published").limit(1).maybeSingle();
      if (!apt || id !== seq.current) return;
      const { data } = await supabase.rpc("quote_stay", {
        p_apartment: apt.id,
        p_range: `[${start},${end})`,
        p_guests: guests,
      });
      if (id === seq.current) {
        setQuote(data as Quote);
        setQuoting(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [start, end, guests, nights]);

  const depositAmount = quote ? Math.round((quote.total * deposit) / 100) : 0;
  const blocking =
    !quote ||
    !quote.available ||
    quote.over_capacity ||
    !quote.meets_min_nights ||
    nights < 1;

  async function confirm() {
    setError(null);
    if (blocking) return;

    if (!authed) {
      const suite = `/reserver?start=${start}&end=${end}&guests=${guests}`;
      router.push(`/connexion?suite=${encodeURIComponent(suite)}`);
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: apt } = await supabase
        .from("apartments").select("id").eq("status", "published").limit(1).maybeSingle();
      const { data, error } = await supabase.rpc("create_reservation", {
        p_apartment: apt!.id,
        p_range: `[${start},${end})`,
        p_guests: guests,
        p_deposit_percent: deposit,
      });
      if (error) throw error;
      const ref = (data as { reference: string }).reference;
      router.push(`/app/reservations/${ref}?pay=1`);
    } catch (err) {
      setError(translate(err));
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_380px] lg:gap-16">
      {/* colonne saisie */}
      <div>
        <h1 className="display text-[2rem] text-ink sm:text-[2.4rem]">Réserver l'appartement</h1>
        <p className="mt-2 text-[14px] text-ink-3">
          Choisissez vos dates. Vous réglez à l'étape suivante, sans surprise.
        </p>

        <section className="mt-9">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
            Vos dates
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-[13px] text-ink-2">Arrivée</span>
              <input type="date" className="field tnum" min={iso(0)} value={start} onChange={(e) => setStart(e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[13px] text-ink-2">Départ</span>
              <input type="date" className="field tnum" min={start || iso(1)} value={end} onChange={(e) => setEnd(e.target.value)} />
            </label>
          </div>
          <label className="mt-3 flex items-center justify-between rounded-[11px] border border-line bg-bone px-4 py-3">
            <span className="text-[14px] text-ink-2">Voyageurs</span>
            <span className="flex items-center gap-3">
              <button type="button" onClick={() => setGuests((g) => Math.max(1, g - 1))} className="press h-8 w-8 rounded-full border border-line text-[16px] leading-none">−</button>
              <span className="tnum w-4 text-center text-[15px]">{guests}</span>
              <button type="button" onClick={() => setGuests((g) => Math.min(4, g + 1))} className="press h-8 w-8 rounded-full border border-line text-[16px] leading-none">+</button>
            </span>
          </label>

          {quote && !quote.available && (
            <p className="mt-3 rounded-[10px] bg-danger/10 px-3 py-2 text-[13px] text-danger">
              Ces dates ne sont pas disponibles. Essayez une autre période.
            </p>
          )}
          {quote && quote.over_capacity && (
            <p className="mt-3 rounded-[10px] bg-danger/10 px-3 py-2 text-[13px] text-danger">
              L'appartement accueille jusqu'à 4 voyageurs.
            </p>
          )}
          {quote && !quote.meets_min_nights && (
            <p className="mt-3 rounded-[10px] bg-warn/10 px-3 py-2 text-[13px] text-warn">
              Séjour minimum de {quote.min_nights} nuits sur cette période.
            </p>
          )}
        </section>

        <section className="mt-9">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
            Paiement
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {([50, 100] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDeposit(d)}
                className={`press rounded-[12px] border p-4 text-left transition-colors ${
                  deposit === d ? "border-forest bg-forest/[0.04]" : "border-line bg-bone hover:border-ink/25"
                }`}
              >
                <span className="flex items-center justify-between">
                  <span className="text-[14px] font-medium text-ink">
                    {d === 50 ? "Acompte 50 %" : "Régler la totalité"}
                  </span>
                  {deposit === d && <Check className="h-4 w-4 text-forest-2" />}
                </span>
                <span className="mt-1 block tnum text-[13px] text-ink-3">
                  {quote ? formatXOF(Math.round((quote.total * d) / 100)) : "—"} maintenant
                </span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-[12.5px] text-ink-3">
            Paiement Mobile Money (MTN, Moov, Celtis) ou carte. Environnement de
            démonstration : le paiement est simulé.
          </p>
        </section>

        {error && (
          <p className="mt-6 rounded-[10px] bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</p>
        )}
      </div>

      {/* récapitulatif */}
      <aside className="lg:sticky lg:top-8 lg:self-start">
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-bone">
          <div className="relative aspect-[16/10]">
            <Image src={aptImg("terrace-palms.jpg")} alt="" fill sizes="380px" className="object-cover object-[50%_78%]" />
          </div>
          <div className="p-5">
            <p className="display text-[1.05rem] text-ink">Les 2 Palmiers</p>
            <p className="text-[13px] text-ink-3">Appartement entier · Cotonou</p>

            <div className="mt-4 space-y-2 border-t border-line pt-4 text-[13.5px]">
              <Row label="Dates">
                {start && end ? `${formatDate(start, { day: "numeric", month: "short" })} — ${formatDate(end, { day: "numeric", month: "short" })}` : "—"}
              </Row>
              <Row label="Voyageurs">{guests}</Row>
              {quote && (
                <>
                  <Row label={`${quote.nights} nuit${quote.nights > 1 ? "s" : ""}`}>
                    {formatXOF(quote.lodging_subtotal)}
                  </Row>
                  <Row label="Ménage">{formatXOF(quote.cleaning_fee)}</Row>
                  {quote.discount_amount > 0 && (
                    <Row label={`Remise ${quote.discount_percent}%`}>
                      <span className="text-forest-2">−{formatXOF(quote.discount_amount)}</span>
                    </Row>
                  )}
                </>
              )}
            </div>

            <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
              <span className="text-[14px] font-medium text-ink">Total</span>
              <span className="tnum display text-[1.3rem] text-ink">
                {quote ? formatXOF(quote.total) : "—"}
              </span>
            </div>
            {quote && (
              <p className="mt-1 text-right tnum text-[12.5px] text-ink-3">
                {formatXOF(depositAmount)} à régler maintenant
              </p>
            )}

            <button
              onClick={confirm}
              disabled={blocking || submitting || quoting}
              className="press mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-[14px] font-medium text-bone transition-colors hover:bg-forest-2 disabled:opacity-45"
            >
              {submitting || quoting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {authed ? "Confirmer et payer" : "Se connecter pour réserver"}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-ink-3">{label}</span>
      <span className="tnum text-right text-ink">{children}</span>
    </div>
  );
}

function translate(err: unknown): string {
  const m = err instanceof Error ? err.message : String(err);
  if (/dates_unavailable/.test(m)) return "Ces dates viennent d'être prises. Choisissez une autre période.";
  if (/over_capacity/.test(m)) return "L'appartement accueille jusqu'à 4 voyageurs.";
  if (/below_min_nights/.test(m)) return "La durée minimale n'est pas atteinte sur cette période.";
  if (/not_authenticated/.test(m)) return "Connectez-vous pour finaliser la réservation.";
  return "La réservation n'a pas pu être créée. Réessayez.";
}
