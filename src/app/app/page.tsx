import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CalendarDays, ConciergeBell, FileText, ShieldCheck, Gift } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Card, StatusBadge, EmptyState } from "@/components/app/ui";
import { MessagingCard } from "@/components/app/messaging-card";
import { getT } from "@/lib/i18n";
import { formatXOF, formatDate, parseRange, nightsBetween } from "@/lib/format";

export const metadata: Metadata = { title: "Aperçu" };

type T = (k: string, v?: Record<string, string | number>) => string;

export default async function AppHome() {
  const { t } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const uid = user!.id;

  const [
    { data: profile },
    { data: reservations },
    { data: orders },
    { data: idStatus },
    { data: contracts },
    { data: convos },
  ] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", uid).maybeSingle(),
    supabase
      .from("reservations")
      .select("id, reference, date_range, status, total_amount, amount_paid, guests_count")
      .in("status", ["pending_payment", "confirmed", "in_stay"])
      .order("created_at", { ascending: false }),
    supabase
      .from("service_orders")
      .select("id, reference, status, scheduled_for, price, service:services(title)")
      .order("created_at", { ascending: false })
      .limit(3),
    supabase.rpc("identity_status", { uid }),
    supabase
      .from("contracts")
      .select("id, reference, status, reservation_id")
      .order("created_at", { ascending: false }),
    supabase
      .from("conversations")
      .select("id, subject, status, last_message_at")
      .order("last_message_at", { ascending: false })
      .limit(1),
  ]);

  const [{ data: loyalty }, { data: loyaltyCfg }] = await Promise.all([
    supabase.from("loyalty_accounts").select("points, tier").eq("client_id", uid).maybeSingle(),
    supabase.from("loyalty_settings").select("enabled, tiers").eq("id", 1).maybeSingle(),
  ]);
  const loyaltyEnabled = loyaltyCfg?.enabled ?? false;
  const nextTier =
    loyaltyEnabled && Array.isArray(loyaltyCfg?.tiers)
      ? (loyaltyCfg!.tiers as { name: string; min_points: number }[])
          .filter((x) => x.min_points > (loyalty?.points ?? 0))
          .sort((a, b) => a.min_points - b.min_points)[0]
      : undefined;

  const next = reservations?.[0];
  const identity = typeof idStatus === "string" ? idStatus : "none";
  const pendingContract = contracts?.find(
    (c) => c.status === "draft" && reservations?.some((r) => r.id === c.reservation_id),
  );
  const convo = convos?.[0];

  let unread = 0;
  if (convo) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("id, sender_id")
      .eq("conversation_id", convo.id)
      .neq("sender_id", uid);
    if (msgs && msgs.length) {
      const { data: reads } = await supabase
        .from("message_reads")
        .select("message_id")
        .eq("user_id", uid);
      const readSet = new Set((reads ?? []).map((r) => r.message_id));
      unread = msgs.filter((m) => !readSet.has(m.id)).length;
    }
  }

  const firstName = (profile?.full_name || "").split(" ")[0];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="display text-[1.7rem] text-ink sm:text-[2rem]">
        {firstName ? t("appHome.helloName", { name: firstName }) : t("appHome.hello")}
      </h1>
      <p className="mt-1 text-[14px] text-ink-3">{t("appHome.lede")}</p>

      {identity !== "approved" && (
        <Link
          href="/app/verification"
          className="press mt-6 flex items-center gap-3 rounded-[var(--radius-lg)] border border-brass/40 bg-brass/8 p-4 transition-colors hover:bg-brass/12"
        >
          <ShieldCheck className="h-5 w-5 shrink-0 text-brass-2" />
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-medium text-ink">
              {identity === "pending"
                ? t("appHome.idPending")
                : identity === "rejected"
                  ? t("appHome.idRejected")
                  : t("appHome.idVerify")}
            </p>
            <p className="text-[12.5px] text-ink-3">{t("appHome.idNote")}</p>
          </div>
          <ArrowRight className="h-4 w-4 text-ink-3" />
        </Link>
      )}

      <div className="mt-6">
        {next ? (
          <NextStay stay={next} t={t} />
        ) : (
          <EmptyState
            title={t("appHome.noStayT")}
            body={t("appHome.noStayB")}
            cta={{ href: "/reserver", label: t("appHome.bookStay") }}
          />
        )}
      </div>

      {pendingContract && (
        <Link
          href={`/contrat/${pendingContract.reference}`}
          className="press mt-4 flex items-center gap-3 rounded-[var(--radius-lg)] border border-line bg-bone p-4 transition-colors hover:border-ink/25"
        >
          <FileText className="h-5 w-5 shrink-0 text-forest-2" />
          <div className="min-w-0 flex-1">
            <p className="text-[13.5px] font-medium text-ink">{t("appHome.contractT")}</p>
            <p className="text-[12.5px] text-ink-3">
              {t("appHome.contractB", { ref: pendingContract.reference })}
            </p>
          </div>
          <ArrowRight className="h-4 w-4 text-ink-3" />
        </Link>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <QuickLink href="/app/reservations" icon={CalendarDays} label={t("appHome.qlReservations")} />
        <QuickLink href="/app/services" icon={ConciergeBell} label={t("appHome.qlServices")} />
        <QuickLink href="/app/compte" icon={ShieldCheck} label={t("appHome.qlProfile")} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <MessagingCard
          conversationId={convo?.id ?? null}
          subject={convo?.subject ?? null}
          lastAt={convo?.last_message_at ?? null}
          unread={unread}
        />
        {loyaltyEnabled && (
          <Link
            href="/app/fidelite"
            className="press block rounded-[var(--radius-lg)] border border-line bg-bone p-5 transition-colors hover:border-ink/20"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bone-2 text-brass-2">
                  <Gift className="h-[18px] w-[18px]" strokeWidth={1.7} />
                </span>
                <div>
                  <p className="text-[14px] font-medium text-ink">{t("appHome.loyalty")}</p>
                  <p className="mt-0.5 text-[12.5px] text-ink-3">
                    {t("appHome.tier")}{" "}
                    <span className="font-medium text-ink">{loyalty?.tier ?? t("appHome.tier0")}</span>
                  </p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-ink-3" />
            </div>
            <p className="tnum mt-3 text-[1.9rem] font-medium text-ink">
              {loyalty?.points ?? 0}
              <span className="ml-1 text-[13px] font-normal text-ink-3">{t("appHome.points")}</span>
            </p>
            {nextTier && (
              <p className="mt-1 text-[12px] text-ink-3">
                {t("appHome.pointsBefore", {
                  n: nextTier.min_points - (loyalty?.points ?? 0),
                  name: nextTier.name,
                })}
              </p>
            )}
          </Link>
        )}
      </div>

      {orders && orders.length > 0 && (
        <section className="mt-10">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
            {t("appHome.recentServices")}
          </h2>
          <ul className="mt-3 divide-y divide-line rounded-[var(--radius-lg)] border border-line bg-bone">
            {orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div>
                  <p className="text-[14px] text-ink">
                    {(o.service as { title?: string } | null)?.title ?? t("appHome.service")}
                  </p>
                  <p className="text-[12px] text-ink-3">
                    {o.scheduled_for ? formatDate(o.scheduled_for) : t("appHome.slotTbd")}
                  </p>
                </div>
                <StatusBadge status={o.status} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function NextStay({ stay, t }: { stay: Record<string, unknown>; t: T }) {
  const { start, end } = parseRange(stay.date_range as string);
  const nights = nightsBetween(start, end);
  const due = (stay.total_amount as number) - (stay.amount_paid as number);
  return (
    <Card className="!bg-forest !text-bone">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[12px] uppercase tracking-[0.16em] text-sand">{t("appHome.nextStay")}</p>
          <p className="display mt-2 text-[1.5rem]">
            {formatDate(start, { day: "numeric", month: "long" })} — {formatDate(end)}
          </p>
          <p className="mt-1 text-[13px] text-bone/60">
            {t("appHome.stayMeta", {
              nights,
              guests: String(stay.guests_count),
              ref: String(stay.reference),
            })}
          </p>
        </div>
        <StatusBadge status={stay.status as string} />
      </div>

      {stay.status === "pending_payment" && due > 0 && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line-dark pt-4">
          <span className="text-[13px] text-bone/70">
            {t("appHome.dueLabel")}{" "}
            <span className="tnum font-medium text-bone">{formatXOF(due)}</span>
          </span>
          <Link
            href={`/app/reservations/${stay.reference}`}
            className="press inline-flex h-10 items-center gap-1.5 rounded-full bg-brass px-5 text-[13px] font-medium text-ink hover:bg-brass-2"
          >
            {t("appHome.payNow")} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}
      {stay.status !== "pending_payment" && (
        <Link
          href={`/app/reservations/${stay.reference}`}
          className="mt-5 inline-flex items-center gap-1.5 border-t border-line-dark pt-4 text-[13px] font-medium text-brass-3"
        >
          {t("appHome.viewDetail")} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </Card>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="press group flex items-center gap-3 rounded-[var(--radius-lg)] border border-line bg-bone p-4 transition-colors hover:border-ink/25"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-bone-2 text-forest-2">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
      </span>
      <span className="text-[13.5px] font-medium text-ink">{label}</span>
    </Link>
  );
}
