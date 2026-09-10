"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDays(iso: string, n: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + n);
  return ymd(d);
}
function eachNight(startIso: string, endIso: string): string[] {
  const out: string[] = [];
  let cur = startIso;
  while (cur < endIso) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

export function AvailabilityCalendar({
  apartmentId,
  start,
  end,
  onChange,
  months = 2,
}: {
  apartmentId: string | null;
  start: string;
  end: string;
  onChange: (start: string, end: string) => void;
  months?: number;
}) {
  const { t, locale } = useT();
  const [blocked, setBlocked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [hover, setHover] = useState<string | null>(null);

  const today = ymd(new Date());

  useEffect(() => {
    if (!apartmentId) {
      setBlocked(new Set());
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      const from = ymd(new Date());
      const to = addDays(from, 365);
      const { data } = await createClient().rpc("apartment_calendar", {
        p_apartment: apartmentId,
        p_from: from,
        p_to: to,
      });
      if (!cancelled) {
        setBlocked(new Set((data as string[] | null) ?? []));
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apartmentId]);

  // une plage est valide si aucune nuit sélectionnée n'est bloquée
  const rangeHasBlocked = useMemo(() => {
    if (!start || !end || end <= start) return false;
    return eachNight(start, end).some((n) => blocked.has(n));
  }, [start, end, blocked]);

  function pick(day: string) {
    if (day < today || blocked.has(day)) return;
    // pas de sélection en cours, ou plage déjà complète → nouveau départ
    if (!start || (start && end)) {
      onChange(day, "");
      return;
    }
    if (day <= start) {
      onChange(day, "");
      return;
    }
    // vérifie qu'aucune nuit entre start et day n'est bloquée
    if (eachNight(start, day).some((n) => blocked.has(n))) {
      onChange(day, ""); // redémarre depuis ce jour
      return;
    }
    onChange(start, day);
  }

  const grids = Array.from({ length: months }, (_, i) => {
    const m = new Date(cursor.getFullYear(), cursor.getMonth() + i, 1);
    return m;
  });

  const monthName = (d: Date) =>
    d.toLocaleDateString(locale === "ar" ? "ar" : locale, { month: "long", year: "numeric" });

  const weekLabels = useMemo(() => {
    // lundi -> dimanche
    const base = new Date(2024, 0, 1); // un lundi
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      return d.toLocaleDateString(locale === "ar" ? "ar" : locale, { weekday: "short" });
    });
  }, [locale]);

  return (
    <div className="rounded-[14px] border border-line bg-bone p-4">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}
          disabled={cursor <= new Date(new Date().getFullYear(), new Date().getMonth(), 1)}
          className="press rounded-full p-1.5 text-ink-2 hover:bg-ink/5 disabled:opacity-30"
          aria-label={t("calendar.prevMonth")}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <span className="text-[13px] font-medium text-ink">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        </span>
        <button
          type="button"
          onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}
          className="press rounded-full p-1.5 text-ink-2 hover:bg-ink/5"
          aria-label={t("calendar.nextMonth")}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {grids.map((m) => {
          const first = new Date(m.getFullYear(), m.getMonth(), 1);
          const startWeekday = (first.getDay() + 6) % 7; // lundi = 0
          const daysInMonth = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
          const cells: (string | null)[] = [
            ...Array(startWeekday).fill(null),
            ...Array.from({ length: daysInMonth }, (_, i) => ymd(new Date(m.getFullYear(), m.getMonth(), i + 1))),
          ];
          return (
            <div key={ymd(m)}>
              <p className="mb-2 text-center text-[12.5px] font-medium capitalize text-ink">{monthName(m)}</p>
              <div className="grid grid-cols-7 gap-y-1 text-center">
                {weekLabels.map((w, i) => (
                  <span key={i} className="pb-1 text-[10px] uppercase text-ink-3">
                    {w}
                  </span>
                ))}
                {cells.map((day, i) => {
                  if (!day) return <span key={i} />;
                  const past = day < today;
                  const isBlocked = blocked.has(day);
                  const inRange =
                    start && (end || hover) && day > start && day < (end || hover || "");
                  const isStart = day === start;
                  const isEnd = day === end;
                  const disabled = past || isBlocked;
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={disabled}
                      onMouseEnter={() => setHover(day)}
                      onMouseLeave={() => setHover(null)}
                      onClick={() => pick(day)}
                      className={`relative mx-auto flex h-8 w-8 items-center justify-center rounded-full text-[12.5px] tnum transition-colors ${
                        disabled
                          ? "text-ink-3/40 line-through"
                          : isStart || isEnd
                            ? "bg-forest text-bone"
                            : inRange
                              ? "bg-forest/12 text-ink"
                              : "text-ink hover:bg-ink/8"
                      }`}
                      aria-label={day}
                    >
                      {Number(day.slice(-2))}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-line-soft pt-3 text-[12px] text-ink-3">
        <span>
          {start && !end
            ? t("calendar.pickCheckout")
            : start && end
              ? `${start} → ${end}`
              : t("calendar.pickCheckin")}
        </span>
        {(start || end) && (
          <button
            type="button"
            onClick={() => onChange("", "")}
            className="press text-forest-2 hover:text-forest"
          >
            {t("calendar.reset")}
          </button>
        )}
      </div>
      {rangeHasBlocked && (
        <p className="mt-2 rounded-[8px] bg-danger/10 px-2.5 py-1.5 text-[12px] text-danger">
          {t("calendar.rangeBlocked")}
        </p>
      )}
    </div>
  );
}
