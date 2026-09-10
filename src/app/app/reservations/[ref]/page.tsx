import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck, FileText, Check, Wifi } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, StatusBadge } from "@/components/app/ui";
import { PaymentPanel } from "@/components/app/payment-panel";
import { ReviewForm } from "@/components/app/review-form";
import { ReservationChangePanel, type ChangeRequest } from "@/components/app/reservation-change-panel";
import { formatXOF, formatDate, parseRange, nightsBetween } from "@/lib/format";
import { getT } from "@/lib/i18n";

export default async function ReservationDetail({
  params,
}: {
  params: Promise<{ ref: string }>;
}) {
  const { ref } = await params;
  const { t } = await getT();
  const supabase = await createClient();

  const { data: r } = await supabase
    .from("reservations")
    .select("*")
    .eq("reference", decodeURIComponent(ref))
    .maybeSingle();

  if (!r) notFound();

  const { start, end } = parseRange(r.date_range as string);
  const nights = nightsBetween(start, end);
  const total = r.total_amount as number;
  const paid = r.amount_paid as number;
  const deposit = (r.deposit_amount as number) || total;
  const dueNow = Math.max(0, deposit - paid); // acompte restant
  const balance = Math.max(0, total - paid); // solde total restant
  const fees = (r.fees ?? {}) as Record<string, number>;

  const [
    { data: payments },
    { data: idStatus },
    { data: contract },
    { data: review },
    { data: stay },
    { data: changeReq },
  ] =
    await Promise.all([
      supabase
        .from("payments")
        .select("internal_ref, method, amount, status, channel, created_at")
        .eq("reservation_id", r.id)
        .order("created_at", { ascending: false }),
      supabase.rpc("identity_status", { uid: r.guest_id as string }),
      supabase.from("contracts").select("reference, status").eq("reservation_id", r.id).maybeSingle(),
      supabase
        .from("reviews")
        .select("rating, title, body, status")
        .eq("reservation_id", r.id)
        .maybeSingle(),
      supabase
        .from("stay_info")
        .select("wifi_ssid, wifi_password, house_manual, checkin_notes, emergency_contact")
        .eq("apartment_id", r.apartment_id as string)
        .maybeSingle(),
      supabase
        .from("reservation_change_requests")
        .select("id, kind, status, new_range, reason, staff_note, created_at")
        .eq("reservation_id", r.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
  const verified = idStatus === "approved";
  const canReview = ["confirmed", "in_stay", "completed"].includes(r.status as string);
  const needsPayment =
    (r.status === "pending_payment" && dueNow > 0) || (r.status === "confirmed" && balance > 0);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/app/reservations"
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> {t("appResDetail.allReservations")}
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="display text-[1.7rem] text-ink sm:text-[2rem]">
            {formatDate(start, { day: "numeric", month: "long" })} — {formatDate(end)}
          </h1>
          <p className="mt-1 text-[13px] text-ink-3">
            {t("appResDetail.metaLine", { ref: r.reference as string, nights, guests: String(r.guests_count) })}
          </p>
        </div>
        <StatusBadge status={r.status as string} />
      </div>

      <div className="mt-7 grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          {needsPayment && !verified && (
            <Card className="!border-brass/40 !bg-brass/8">
              <div className="flex items-start gap-3">
                <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brass-2" />
                <div>
                  <p className="text-[14px] font-medium text-ink">{t("appResDetail.idT")}</p>
                  <p className="mt-0.5 text-[13px] text-ink-3">{t("appResDetail.idB")}</p>
                  <Link
                    href="/app/verification"
                    className="press mt-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[12.5px] font-medium text-bone hover:bg-forest-2"
                  >
                    {t("appResDetail.idCta")}
                  </Link>
                </div>
              </div>
            </Card>
          )}

          {r.status === "pending_payment" && dueNow > 0 && verified && (
            <PaymentPanel purpose="reservation" targetId={r.id as string} amountDue={dueNow} />
          )}
          {r.status === "confirmed" && balance > 0 && verified && (
            <PaymentPanel
              purpose="balance"
              targetId={r.id as string}
              amountDue={balance}
              label={t("appResDetail.payBalance")}
            />
          )}

          {stay && (stay.wifi_ssid || stay.house_manual || stay.checkin_notes) && (
            <Card>
              <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
                <Wifi className="h-3.5 w-3.5" /> {t("appResDetail.stayInfo")}
              </h2>
              <dl className="mt-3 space-y-2 text-[13.5px]">
                {stay.wifi_ssid && <Line label={t("appResDetail.wifi")}>{stay.wifi_ssid}</Line>}
                {stay.wifi_password && (
                  <Line label={t("appResDetail.wifiPass")}>
                    <span className="tnum select-all">{stay.wifi_password}</span>
                  </Line>
                )}
                {stay.emergency_contact && <Line label={t("appResDetail.emergency")}>{stay.emergency_contact}</Line>}
              </dl>
              {stay.checkin_notes && (
                <p className="mt-3 whitespace-pre-wrap border-t border-line-soft pt-3 text-[13px] text-ink-2">
                  {stay.checkin_notes}
                </p>
              )}
              {stay.house_manual && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-[13px] font-medium text-ink">
                    {t("appResDetail.houseManual")}
                  </summary>
                  <p className="mt-2 whitespace-pre-wrap text-[13px] text-ink-2">{stay.house_manual}</p>
                </details>
              )}
            </Card>
          )}

          {["pending_payment", "confirmed", "in_stay"].includes(r.status as string) && (
            <ReservationChangePanel
              reservationId={r.id as string}
              start={start}
              end={end}
              allowCancel={["pending_payment", "confirmed"].includes(r.status as string)}
              request={(changeReq as ChangeRequest | null) ?? null}
            />
          )}

          {canReview && (
            <ReviewForm
              reservationId={r.id as string}
              existing={
                review
                  ? {
                      rating: review.rating,
                      title: review.title,
                      body: review.body,
                      status: review.status,
                    }
                  : null
              }
            />
          )}

          <Card>
            <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
              {t("appResDetail.priceDetail")}
            </h2>
            <dl className="mt-4 space-y-2 text-[14px]">
              <Line label={t("appResDetail.lodgingN", { n: nights })}>
                {formatXOF((r.nightly_price as number) * nights)}
              </Line>
              {fees.cleaning_fee != null && (
                <Line label={t("appResDetail.cleaning")}>{formatXOF(fees.cleaning_fee)}</Line>
              )}
              {(r.discount_amount as number) > 0 && (
                <Line label={t("appResDetail.discount")}>
                  <span className="text-forest-2">−{formatXOF(r.discount_amount as number)}</span>
                </Line>
              )}
              <div className="flex justify-between border-t border-line pt-2 font-medium text-ink">
                <dt>{t("appResDetail.total")}</dt>
                <dd className="tnum">{formatXOF(r.total_amount as number)}</dd>
              </div>
              <Line label={t("appResDetail.alreadyPaid")}>{formatXOF(paid)}</Line>
              {balance > 0 && (
                <Line label={t("appResDetail.remaining")}>
                  <span className="font-medium text-ink">{formatXOF(balance)}</span>
                </Line>
              )}
            </dl>
          </Card>

          {payments && payments.length > 0 && (
            <Card>
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
                {t("appResDetail.payments")}
              </h2>
              <ul className="mt-3 divide-y divide-line">
                {payments.map((p) => (
                  <li key={p.internal_ref} className="flex items-center justify-between py-2.5 text-[13.5px]">
                    <span className="text-ink-2">
                      {formatDate(p.created_at as string, { day: "numeric", month: "short" })} ·{" "}
                      {String(p.method).toUpperCase()}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="tnum text-ink">{formatXOF(p.amount as number)}</span>
                      <StatusBadge status={p.status as string} />
                      {p.status === "paid" && (
                        <Link
                          href={`/recu/${encodeURIComponent(p.internal_ref as string)}`}
                          target="_blank"
                          className="text-[12px] text-ink-3 underline underline-offset-2 hover:text-ink"
                        >
                          {t("appResDetail.receipt")}
                        </Link>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        <aside className="space-y-4">
          <Card>
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
              {t("appResDetail.yourStay")}
            </h3>
            <dl className="mt-3 space-y-2 text-[13.5px]">
              <Line label={t("appResDetail.checkin")}>{t("appResDetail.checkinVal")}</Line>
              <Line label={t("appResDetail.checkout")}>{t("appResDetail.checkoutVal")}</Line>
              <Line label={t("appResDetail.address")}>{t("appResDetail.addressVal")}</Line>
            </dl>
          </Card>

          {contract && (
            <Link
              href={`/contrat/${contract.reference}`}
              className="press flex items-center gap-3 rounded-[var(--radius-lg)] border border-line bg-bone px-5 py-4 hover:border-ink/25"
            >
              <FileText className="h-5 w-5 shrink-0 text-forest-2" />
              <div className="min-w-0">
                <p className="text-[13.5px] font-medium text-ink">{t("appResDetail.contract")}</p>
                <p className="text-[12px] text-ink-3">
                  {contract.status === "draft" ? (
                    t("appResDetail.contractDraft")
                  ) : (
                    <span className="inline-flex items-center gap-1 text-forest-2">
                      <Check className="h-3 w-3" /> {t("appResDetail.contractSigned")}
                    </span>
                  )}
                </p>
              </div>
            </Link>
          )}
          <Link
            href={`/facture/${encodeURIComponent(r.reference as string)}`}
            target="_blank"
            className="press flex items-center justify-center rounded-[var(--radius-lg)] border border-line bg-bone px-5 py-4 text-[13.5px] font-medium text-ink hover:border-ink/25"
          >
            {t("appResDetail.invoice")}
          </Link>
          <Link
            href="/app/services"
            className="press flex items-center justify-center rounded-[var(--radius-lg)] border border-line bg-bone px-5 py-4 text-[13.5px] font-medium text-ink hover:border-ink/25"
          >
            {t("appResDetail.addService")}
          </Link>
          <Link
            href="/app/messages"
            className="block text-center text-[13px] text-ink-3 underline underline-offset-2 hover:text-ink"
          >
            {t("appResDetail.askTeam")}
          </Link>
        </aside>
      </div>
    </div>
  );
}

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-3">{label}</dt>
      <dd className="tnum text-right text-ink">{children}</dd>
    </div>
  );
}
