"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { ArrowRight, Check, Loader2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatXOF, formatDate, nightsBetween } from "@/lib/format";
import { aptImg } from "@/lib/site";
import { ServiceIcon } from "@/components/marketing/service-icon";
import { track } from "@/lib/track";

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

type Apt = {
  id: string;
  slug: string;
  name: string;
  capacity: number;
  base_price: number;
  cover: string | null;
};

type Svc = { id: string; slug: string; title: string; icon: string | null; base_price: number };

function iso(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export function ReservationFunnel({ authed }: { authed: boolean }) {
  const router = useRouter();
  const params = useSearchParams();

  const [apts, setApts] = useState<Apt[]>([]);
  const [aptId, setAptId] = useState<string | null>(null);
  const [services, setServices] = useState<Svc[]>([]);
  const [chosen, setChosen] = useState<Set<string>>(new Set());

  const [start, setStart] = useState(params.get("start") || "");
  const [end, setEnd] = useState(params.get("end") || "");
  const [guests, setGuests] = useState(Number(params.get("guests")) || 2);
  const [deposit, setDeposit] = useState<50 | 100>(50);
  const [quote, setQuote] = useState<Quote>(null);
  const [quoting, setQuoting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seq = useRef(0);

  const apt = apts.find((a) => a.id === aptId) ?? null;

  // charge les appartements + les services à prix fixe
  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const [{ data: aptRows }, { data: mediaRows }, { data: svcRows }] = await Promise.all([
        supabase
          .from("apartments")
          .select("id, slug, name, capacity, base_price")
          .eq("status", "published")
          .order("created_at"),
        supabase.from("apartment_media").select("apartment_id, storage_path, is_cover, position"),
        supabase
          .from("services")
          .select("id, slug, title, icon, base_price")
          .eq("active", true)
          .eq("pricing_mode", "fixed")
          .order("position"),
      ]);
      const list: Apt[] = (aptRows ?? []).map((a) => {
        const own = (mediaRows ?? []).filter((m) => m.apartment_id === a.id);
        const cov = own.find((m) => m.is_cover) ?? own.sort((x, y) => x.position - y.position)[0];
        const path = cov?.storage_path as string | undefined;
        return {
          ...a,
          cover: path ? (/^https?:\/\//.test(path) ? path : aptImg(path)) : null,
        };
      });
      setApts(list);
      const wanted = params.get("apartment");
      setAptId(list.find((a) => a.slug === wanted)?.id ?? list[0]?.id ?? null);
      setServices((svcRows ?? []) as Svc[]);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!start) setStart(iso(14));
    if (!end) setEnd(iso(18));
  }, [start, end]);

  const nights = useMemo(() => (start && end ? nightsBetween(start, end) : 0), [start, end]);
  const svcTotal = useMemo(
    () => services.filter((s) => chosen.has(s.id)).reduce((n, s) => n + Number(s.base_price), 0),
    [services, chosen],
  );

  useEffect(() => {
    if (!aptId || !start || !end || nights < 1) {
      setQuote(null);
      return;
    }
    const id = ++seq.current;
    setQuoting(true);
    const t = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase.rpc("quote_stay", {
        p_apartment: aptId,
        p_range: `[${start},${end})`,
        p_guests: guests,
      });
      if (id === seq.current) {
        setQuote(data as Quote);
        setQuoting(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [aptId, start, end, guests, nights]);

  const stayTotal = quote?.total ?? 0;
  const grandTotal = stayTotal + svcTotal;
  const depositAmount = quote ? Math.round((stayTotal * deposit) / 100) + svcTotal : 0;
  const blocking =
    !apt ||
    !quote ||
    !quote.available ||
    quote.over_capacity ||
    !quote.meets_min_nights ||
    nights < 1;

  function toggleSvc(id: string) {
    setChosen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  async function confirm() {
    setError(null);
    if (blocking || !apt) return;

    const q = `apartment=${apt.slug}&start=${start}&end=${end}&guests=${guests}`;
    if (!authed) {
      router.push(`/connexion?suite=${encodeURIComponent(`/reserver?${q}`)}`);
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("create_booking", {
        p_apartment: apt.id,
        p_range: `[${start},${end})`,
        p_guests: guests,
        p_deposit_percent: deposit,
        p_services: [...chosen],
      });
      if (error) throw error;
      const ref = (data as { reference: string }).reference;
      void track("booking", { apartment: apt.slug, services: chosen.size, amount: depositAmount });
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
        <h1 className="display text-[2rem] text-ink sm:text-[2.4rem]">Réserver un séjour</h1>
        <p className="mt-2 text-[14px] text-ink-3">
          Choisissez l&apos;appartement, vos dates et les services. Un seul récapitulatif, un seul
          paiement.
        </p>

        {apts.length > 1 && (
          <section className="mt-9">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
              L&apos;appartement
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {apts.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAptId(a.id)}
                  className={`press flex items-center gap-3 rounded-[12px] border p-2.5 text-left transition-colors ${
                    aptId === a.id ? "border-forest bg-forest/[0.04]" : "border-line hover:border-ink/25"
                  }`}
                >
                  <span className="relative h-14 w-16 shrink-0 overflow-hidden rounded-[8px] bg-bone-2">
                    {a.cover && (
                      <Image src={a.cover} alt="" fill sizes="64px" className="object-cover" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium text-ink">{a.name}</span>
                    <span className="block text-[12px] text-ink-3">
                      {a.capacity} voy. · dès {formatXOF(a.base_price)}/nuit
                    </span>
                  </span>
                  {aptId === a.id && <Check className="h-4 w-4 shrink-0 text-forest-2" />}
                </button>
              ))}
            </div>
          </section>
        )}

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
              <button type="button" onClick={() => setGuests((g) => Math.min(apt?.capacity ?? 4, g + 1))} className="press h-8 w-8 rounded-full border border-line text-[16px] leading-none">+</button>
            </span>
          </label>

          {quote && !quote.available && (
            <p className="mt-3 rounded-[10px] bg-danger/10 px-3 py-2 text-[13px] text-danger">
              Ces dates ne sont pas disponibles. Essayez une autre période.
            </p>
          )}
          {quote && quote.over_capacity && (
            <p className="mt-3 rounded-[10px] bg-danger/10 px-3 py-2 text-[13px] text-danger">
              Cet appartement accueille jusqu&apos;à {apt?.capacity} voyageurs.
            </p>
          )}
          {quote && !quote.meets_min_nights && (
            <p className="mt-3 rounded-[10px] bg-warn/10 px-3 py-2 text-[13px] text-warn">
              Séjour minimum de {quote.min_nights} nuits sur cette période.
            </p>
          )}
        </section>

        {services.length > 0 && (
          <section className="mt-9">
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
              Ajouter des services <span className="font-normal text-ink-3/70">(facultatif)</span>
            </h2>
            <div className="mt-4 space-y-2">
              {services.map((sv) => {
                const on = chosen.has(sv.id);
                return (
                  <button
                    key={sv.id}
                    type="button"
                    onClick={() => toggleSvc(sv.id)}
                    className={`press flex w-full items-center gap-3 rounded-[11px] border p-3 text-left transition-colors ${
                      on ? "border-forest bg-forest/[0.04]" : "border-line hover:border-ink/25"
                    }`}
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bone-2 text-forest-2">
                      <ServiceIcon name={sv.icon ?? "compass"} className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[13.5px] font-medium text-ink">{sv.title}</span>
                      <span className="tnum block text-[12px] text-ink-3">
                        {formatXOF(sv.base_price)} · prépayé
                      </span>
                    </span>
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                        on ? "border-forest bg-forest text-bone" : "border-line text-ink-3"
                      }`}
                    >
                      {on ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[12px] text-ink-3">
              D&apos;autres prestations (sur devis) se demandent depuis votre espace après réservation.
            </p>
          </section>
        )}

        <section className="mt-9">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">Paiement</h2>
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
                  {quote ? formatXOF(Math.round((stayTotal * d) / 100) + svcTotal) : "—"} maintenant
                </span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-[12.5px] text-ink-3">
            Paiement Mobile Money (MTN, Moov, Celtis) ou carte. Environnement de démonstration : le
            paiement est simulé.
          </p>
        </section>

        {error && (
          <p className="mt-6 rounded-[10px] bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</p>
        )}
      </div>

      {/* récapitulatif */}
      <aside className="lg:sticky lg:top-8 lg:self-start">
        <div className="overflow-hidden rounded-[var(--radius-lg)] border border-line bg-bone">
          <div className="relative aspect-[16/10] bg-bone-2">
            {apt?.cover && (
              <Image src={apt.cover} alt="" fill sizes="380px" className="object-cover" />
            )}
          </div>
          <div className="p-5">
            <p className="display text-[1.05rem] text-ink">{apt?.name ?? "Les 2 Palmiers"}</p>
            <p className="text-[13px] text-ink-3">Appartement entier · Cotonou</p>

            <div className="mt-4 space-y-2 border-t border-line pt-4 text-[13.5px]">
              <Row label="Dates">
                {start && end
                  ? `${formatDate(start, { day: "numeric", month: "short" })} — ${formatDate(end, { day: "numeric", month: "short" })}`
                  : "—"}
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
                  {services
                    .filter((s) => chosen.has(s.id))
                    .map((s) => (
                      <Row key={s.id} label={s.title}>
                        {formatXOF(s.base_price)}
                      </Row>
                    ))}
                </>
              )}
            </div>

            <div className="mt-4 flex items-baseline justify-between border-t border-line pt-4">
              <span className="text-[14px] font-medium text-ink">Total</span>
              <span className="tnum display text-[1.3rem] text-ink">
                {quote ? formatXOF(grandTotal) : "—"}
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
  if (/over_capacity/.test(m)) return "Le nombre de voyageurs dépasse la capacité de l'appartement.";
  if (/below_min_nights/.test(m)) return "La durée minimale n'est pas atteinte sur cette période.";
  if (/not_authenticated/.test(m)) return "Connectez-vous pour finaliser la réservation.";
  return "La réservation n'a pas pu être créée. Réessayez.";
}
