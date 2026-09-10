import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Mark } from "@/components/brand/mark";
import { PrintButton } from "@/components/app/print-button";
import { I18nProvider } from "@/lib/i18n/provider";
import { getLocale, getMessages, getT } from "@/lib/i18n";
import { site } from "@/lib/site";
import { formatXOF, formatDate, parseRange, nightsBetween } from "@/lib/format";

export const metadata: Metadata = { title: "Facture", robots: { index: false } };

export default async function InvoicePage({ params }: { params: Promise<{ ref: string }> }) {
  const { ref } = await params;
  const supabase = await createClient();
  const locale = await getLocale();
  const messages = await getMessages(locale);
  const { t } = await getT();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/connexion?suite=${encodeURIComponent(`/facture/${ref}`)}`);

  const { data: r } = await supabase
    .from("reservations")
    .select(
      "id, reference, date_range, guests_count, nightly_price, fees, discount_amount, total_amount, amount_paid, currency, guest:profiles!reservations_guest_id_fkey(full_name, phone)",
    )
    .eq("reference", decodeURIComponent(ref))
    .maybeSingle();
  if (!r) notFound();

  const { data: inv } = await supabase
    .rpc("get_or_create_invoice", { p_reservation: r.id as string })
    .maybeSingle();
  if (!inv) notFound();

  const { data: payments } = await supabase
    .from("payments")
    .select("internal_ref, method, amount, status, paid_at, created_at")
    .eq("reservation_id", r.id)
    .order("created_at");

  const { start, end } = parseRange(r.date_range as string);
  const nights = nightsBetween(start, end);
  const fees = (r.fees ?? {}) as Record<string, number>;
  const guest = r.guest as { full_name?: string; phone?: string } | null;
  const lodging = (r.nightly_price as number) * nights;
  const total = r.total_amount as number;
  const paid = r.amount_paid as number;
  const balance = Math.max(0, total - paid);
  const invoice = inv as { number: string; issued_at: string };

  const lines: { label: string; amount: number }[] = [
    { label: t("invoice.lineLodging", { n: nights }), amount: lodging },
  ];
  if (fees.cleaning_fee) lines.push({ label: t("invoice.lineCleaning"), amount: fees.cleaning_fee });
  if (fees.services_prepaid) lines.push({ label: t("invoice.lineServices"), amount: fees.services_prepaid });
  if ((r.discount_amount as number) > 0)
    lines.push({ label: t("invoice.lineDiscount"), amount: -(r.discount_amount as number) });

  return (
    <I18nProvider locale={locale} messages={messages}>
      <div className="min-h-dvh bg-bone-2 px-4 py-10 print:bg-white print:p-0">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 flex justify-end print:hidden">
            <PrintButton />
          </div>

          <article className="rounded-[var(--radius-lg)] border border-line bg-bone p-8 print:rounded-none print:border-0 print:p-6">
            <header className="flex items-start justify-between border-b border-ink/15 pb-5">
              <div className="flex items-center gap-2.5">
                <Mark className="h-9 w-9" tone="ink" />
                <div>
                  <p className="display text-[1.1rem] text-ink">Les 2 Palmiers</p>
                  <p className="text-[11px] text-ink-3">
                    {site.legalName} · {site.city}, {site.country}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[11px] uppercase tracking-[0.14em] text-ink-3">{t("invoice.title")}</p>
                <p className="tnum text-[14px] font-medium text-ink">{invoice.number}</p>
                <p className="tnum text-[11px] text-ink-3">{formatDate(invoice.issued_at)}</p>
              </div>
            </header>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-ink-3">{t("invoice.billedTo")}</p>
                <p className="mt-1 text-[13.5px] text-ink">{guest?.full_name ?? "—"}</p>
                {guest?.phone && <p className="tnum text-[12.5px] text-ink-3">{guest.phone}</p>}
              </div>
              <div className="sm:text-right">
                <p className="text-[11px] uppercase tracking-[0.14em] text-ink-3">{t("invoice.stay")}</p>
                <p className="mt-1 text-[13.5px] text-ink">
                  {formatDate(start)} — {formatDate(end)}
                </p>
                <p className="text-[12.5px] text-ink-3">
                  {t("invoice.ref")} {r.reference} · {t("invoice.guestsN", { n: r.guests_count as number })}
                </p>
              </div>
            </div>

            <table className="mt-6 w-full border-t border-ink/15 text-[13.5px]">
              <tbody>
                {lines.map((l, i) => (
                  <tr key={i} className="border-b border-line-soft">
                    <td className="py-2.5 text-ink-2">{l.label}</td>
                    <td className="py-2.5 text-right tnum text-ink">
                      {l.amount < 0 ? "−" : ""}
                      {formatXOF(Math.abs(l.amount))}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="pt-3 text-[14px] font-medium text-ink">{t("invoice.total")}</td>
                  <td className="pt-3 text-right tnum display text-[1.3rem] text-ink">{formatXOF(total)}</td>
                </tr>
                <tr>
                  <td className="py-1 text-ink-3">{t("invoice.paid")}</td>
                  <td className="py-1 text-right tnum text-ink-2">{formatXOF(paid)}</td>
                </tr>
                <tr>
                  <td className="text-[13.5px] font-medium text-ink">{t("invoice.balanceDue")}</td>
                  <td className="text-right tnum text-[13.5px] font-medium text-ink">{formatXOF(balance)}</td>
                </tr>
              </tbody>
            </table>

            {payments && payments.filter((p) => p.status === "paid").length > 0 && (
              <div className="mt-6 border-t border-ink/15 pt-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-ink-3">{t("invoice.payments")}</p>
                <ul className="mt-2 space-y-1 text-[12.5px]">
                  {payments
                    .filter((p) => p.status === "paid")
                    .map((p) => (
                      <li key={p.internal_ref} className="flex justify-between">
                        <span className="text-ink-3">
                          {formatDate((p.paid_at ?? p.created_at) as string)} · {String(p.method).toUpperCase()}
                        </span>
                        <span className="tnum text-ink">{formatXOF(p.amount as number)}</span>
                      </li>
                    ))}
                </ul>
              </div>
            )}

            <footer className="mt-8 border-t border-ink/15 pt-4 text-[11px] leading-relaxed text-ink-3">
              {site.legalName} · {site.email} · {site.phones[0]}
              <br />
              {t("invoice.demoNote")}
            </footer>
          </article>
        </div>
      </div>
    </I18nProvider>
  );
}
