import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/app/ui";
import { formatXOF, formatDate, parseRange } from "@/lib/format";
import { getT } from "@/lib/i18n";

export const metadata: Metadata = { title: "Fiche client" };

export default async function ClientDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { t } = await getT();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "id, full_name, phone, locale, address, city, country, date_of_birth, nationality, created_at, last_seen_at, avatar_url",
    )
    .eq("id", id)
    .maybeSingle();
  if (!profile) notFound();

  const [
    { data: verifs },
    { data: reservations },
    { data: orders },
    { data: payments },
    { data: convos },
  ] = await Promise.all([
    supabase
      .from("identity_verifications")
      .select("id, status, submitted_at, reviewed_at, rejection_reason")
      .eq("user_id", id)
      .order("submitted_at", { ascending: false }),
    supabase
      .from("reservations")
      .select("id, reference, date_range, status, total_amount, amount_paid")
      .eq("guest_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("service_orders")
      .select("id, reference, status, price, created_at, service:services(title)")
      .eq("customer_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("payments")
      .select("internal_ref, amount, status, purpose, created_at")
      .eq("payer_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("conversations")
      .select("id, subject, status, last_message_at")
      .eq("customer_id", id)
      .order("last_message_at", { ascending: false }),
  ]);

  const idStatus = verifs?.[0]?.status ?? "none";
  const online =
    profile.last_seen_at && Date.now() - new Date(profile.last_seen_at).getTime() < 3 * 60_000;

  const totalPaid = (payments ?? [])
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + Number(p.amount), 0);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/staff/clients"
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> {t("console.clientDetail.allClients")}
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="display text-[1.7rem] text-ink sm:text-[2rem]">
            {profile.full_name || t("console.catEditor.untitled")}
          </h1>
          <p className="mt-1 flex items-center gap-2 text-[13px] text-ink-3">
            <span className={`h-2 w-2 rounded-full ${online ? "bg-forest-2" : "bg-ink-3/40"}`} />
            {online ? t("console.clientDetail.online") : profile.last_seen_at ? `${t("console.clientDetail.seen")} ${formatDate(profile.last_seen_at)}` : t("console.clientDetail.neverConnected")}
            {" · "}{t("console.lists.registeredOn")} {formatDate(profile.created_at)}
          </p>
        </div>
        <IdentityPill
          status={idStatus}
          label={t(
            idStatus === "approved"
              ? "console.clientDetail.idVerified"
              : idStatus === "pending"
                ? "console.clientDetail.idPending"
                : idStatus === "rejected"
                  ? "console.clientDetail.idRejected"
                  : "console.clientDetail.idNone",
          )}
        />
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2">
        <section className="rounded-[var(--radius-lg)] border border-line bg-bone p-5">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">{t("console.clientDetail.contact")}</h2>
          <dl className="mt-3 space-y-1.5 text-[13px]">
            <Row label={t("console.settings.phones")}>{profile.phone || "—"}</Row>
            <Row label={t("console.contractEd.address")}>
              {[profile.address, profile.city, profile.country].filter(Boolean).join(", ") || "—"}
            </Row>
            <Row label={t("console.verif.birth")}>{profile.date_of_birth || "—"}</Row>
            <Row label={t("console.verif.nationality")}>{profile.nationality || "—"}</Row>
            <Row label={t("console.clientDetail.language")}>{(profile.locale || "fr").toUpperCase()}</Row>
          </dl>
        </section>

        <section className="rounded-[var(--radius-lg)] border border-line bg-bone p-5">
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">{t("console.clientDetail.summary")}</h2>
          <dl className="mt-3 space-y-1.5 text-[13px]">
            <Row label={t("console.title.reservations")}>{reservations?.length ?? 0}</Row>
            <Row label={t("console.clientDetail.serviceOrders")}>{orders?.length ?? 0}</Row>
            <Row label={t("console.clientDetail.totalPaid")}>{formatXOF(totalPaid)}</Row>
            <Row label={t("console.clientDetail.conversations")}>{convos?.length ?? 0}</Row>
          </dl>
          {idStatus === "pending" && (
            <Link
              href="/staff/verifications"
              className="press mt-4 inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[12.5px] font-medium text-bone hover:bg-forest-2"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> {t("console.clientDetail.handleVerif")}
            </Link>
          )}
        </section>
      </div>

      <Block title={t("console.title.reservations")}>
        {reservations && reservations.length > 0 ? (
          <ul className="divide-y divide-line">
            {reservations.map((r) => {
              const { start, end } = parseRange(r.date_range as string);
              return (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3 text-[13px]">
                  <Link href={`/staff/reservations`} className="text-ink hover:underline">
                    {formatDate(start)} — {formatDate(end)} · {t("console.lists.ref")} {r.reference}
                  </Link>
                  <span className="flex items-center gap-2">
                    <span className="tnum text-ink-3">
                      {formatXOF(Number(r.amount_paid))}/{formatXOF(Number(r.total_amount))}
                    </span>
                    <StatusBadge status={r.status as string} />
                  </span>
                </li>
              );
            })}
          </ul>
        ) : (
          <Empty>{t("console.clientDetail.noReservations")}</Empty>
        )}
      </Block>

      <Block title={t("console.clientDetail.serviceOrders")}>
        {orders && orders.length > 0 ? (
          <ul className="divide-y divide-line">
            {orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 py-3 text-[13px]">
                <span className="text-ink">
                  {(o.service as { title?: string } | null)?.title ?? t("console.stats.service")} · {t("console.lists.ref")} {o.reference}
                </span>
                <span className="flex items-center gap-2">
                  {o.price != null && <span className="tnum text-ink-3">{formatXOF(Number(o.price))}</span>}
                  <StatusBadge status={o.status as string} />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>{t("console.clientDetail.noOrders")}</Empty>
        )}
      </Block>

      <Block title={t("console.title.paiements")}>
        {payments && payments.length > 0 ? (
          <ul className="divide-y divide-line">
            {payments.map((p) => (
              <li key={p.internal_ref} className="flex items-center justify-between gap-3 py-3 text-[13px]">
                <span className="text-ink-2">
                  {formatDate(p.created_at as string)} · {p.purpose}
                </span>
                <span className="flex items-center gap-2">
                  <span className="tnum text-ink">{formatXOF(Number(p.amount))}</span>
                  <StatusBadge status={p.status as string} />
                  {p.status === "paid" && (
                    <Link
                      href={`/recu/${encodeURIComponent(p.internal_ref as string)}`}
                      target="_blank"
                      className="text-[11px] text-ink-3 underline underline-offset-2 hover:text-ink"
                    >
                      {t("console.payments.receipt")}
                    </Link>
                  )}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>{t("console.empty.paymentsB")}</Empty>
        )}
      </Block>

      <Block title={t("console.clientDetail.conversations")}>
        {convos && convos.length > 0 ? (
          <ul className="divide-y divide-line">
            {convos.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-3 text-[13px]">
                <Link href={`/staff/messages/${c.id}`} className="text-ink hover:underline">
                  {c.subject || t("console.lists.support")}
                </Link>
                <span className="text-ink-3">
                  {c.last_message_at ? formatDate(c.last_message_at) : ""} · {c.status}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>{t("console.empty.conversationsB")}</Empty>
        )}
      </Block>
    </div>
  );
}

function IdentityPill({ status, label }: { status: string; label: string }) {
  const map = {
    approved: { icon: ShieldCheck, cls: "bg-ok/12 text-forest-2" },
    pending: { icon: ShieldQuestion, cls: "bg-warn/12 text-warn" },
    rejected: { icon: ShieldAlert, cls: "bg-danger/12 text-danger" },
    none: { icon: ShieldAlert, cls: "bg-ink/8 text-ink-3" },
  } as const;
  const s = map[status as keyof typeof map] ?? map.none;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium ${s.cls}`}>
      <Icon className="h-3.5 w-3.5" /> {label}
    </span>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-3">{label}</dt>
      <dd className="text-right text-ink">{children}</dd>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">{title}</h2>
      <div className="mt-2 rounded-[var(--radius-lg)] border border-line bg-bone px-5">{children}</div>
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-4 text-[13px] text-ink-3">{children}</p>;
}
