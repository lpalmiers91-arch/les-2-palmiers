import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, ShieldAlert, ShieldQuestion, ArrowRight, type LucideIcon } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageTitle } from "@/components/app/ui";
import { AccountForm } from "@/components/app/account-form";
import { NotificationPrefs } from "@/components/app/notification-prefs";
import { getT } from "@/lib/i18n";

export const metadata: Metadata = { title: "Compte" };

type T = (k: string, v?: Record<string, string | number>) => string;

export default async function ComptePage() {
  const { t } = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: verif }] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "full_name, phone, locale, avatar_url, address, city, country, postal_code, date_of_birth, nationality, bio, preferences",
      )
      .eq("id", user!.id)
      .maybeSingle(),
    supabase
      .from("identity_verifications")
      .select("status, rejection_reason, submitted_at")
      .eq("user_id", user!.id)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const status = verif?.status ?? "none";
  const notif = ((profile?.preferences ?? {}) as { notif?: { email?: boolean; push?: boolean } }).notif ?? {};

  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle title={t("appAccount.title")} />

      <IdentityCard status={status} reason={verif?.rejection_reason ?? null} t={t} />

      <div className="mt-8">
        <NotificationPrefs initialEmail={notif.email !== false} initialPush={notif.push !== false} />
      </div>

      <div className="mt-8">
        <AccountForm
          userId={user!.id}
          email={user!.email ?? ""}
          initial={{
            full_name: profile?.full_name ?? "",
            phone: profile?.phone ?? "",
            locale: profile?.locale ?? "fr",
            avatar_url: profile?.avatar_url ?? null,
            address: profile?.address ?? "",
            city: profile?.city ?? "",
            country: profile?.country ?? "",
            postal_code: profile?.postal_code ?? "",
            date_of_birth: profile?.date_of_birth ?? "",
            nationality: profile?.nationality ?? "",
            bio: profile?.bio ?? "",
          }}
        />
      </div>
    </div>
  );
}

function IdentityCard({ status, reason, t }: { status: string; reason: string | null; t: T }) {
  const map: Record<
    string,
    { icon: LucideIcon; tone: string; title: string; body: string; cta: { href: string; label: string } | null }
  > = {
    approved: {
      icon: ShieldCheck,
      tone: "text-forest-2",
      title: t("appAccount.idApprovedT"),
      body: t("appAccount.idApprovedB"),
      cta: null,
    },
    pending: {
      icon: ShieldQuestion,
      tone: "text-brass-2",
      title: t("appAccount.idPendingT"),
      body: t("appAccount.idPendingB"),
      cta: null,
    },
    rejected: {
      icon: ShieldAlert,
      tone: "text-danger",
      title: t("appAccount.idRejectedT"),
      body: reason || t("appAccount.idRejectedB"),
      cta: { href: "/app/verification", label: t("appAccount.idRestart") },
    },
    none: {
      icon: ShieldAlert,
      tone: "text-brass-2",
      title: t("appAccount.idNoneT"),
      body: t("appAccount.idNoneB"),
      cta: { href: "/app/verification", label: t("appAccount.idStart") },
    },
  };
  const s = map[status] ?? map.none;
  const Icon = s.icon;
  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-5">
      <div className="flex items-start gap-3">
        <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${s.tone}`} />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-medium text-ink">{s.title}</p>
          <p className="mt-0.5 text-[13px] text-ink-3">{s.body}</p>
          {s.cta && (
            <Link
              href={s.cta.href}
              className="press mt-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[12.5px] font-medium text-bone hover:bg-forest-2"
            >
              {s.cta.label} <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
