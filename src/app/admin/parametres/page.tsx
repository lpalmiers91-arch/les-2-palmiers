import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageTitle, Card } from "@/components/app/ui";
import { PaymentSettingsForm, type PaymentSettings } from "@/components/console/payment-settings-form";
import { getT } from "@/lib/i18n";

export const metadata: Metadata = { title: "Paramètres" };

export default async function ParametresPage() {
  const { t } = await getT();
  const supabase = await createClient();
  const [{ data: s }, { data: pay }] = await Promise.all([
    supabase.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    supabase
      .from("payment_settings")
      .select(
        "active_provider, mode, fedapay_public_key, kkiapay_public_key, stripe_public_key, currency, multicurrency_enabled, fx_rates",
      )
      .eq("id", 1)
      .maybeSingle(),
  ]);
  const company = (s?.company ?? {}) as Record<string, unknown>;

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title={t("console.title.parametres")} sub={t("console.sub.parametres")} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
            {t("console.settings.company")}
          </h2>
          <dl className="mt-3 space-y-2 text-[13.5px]">
            <Row k={t("console.settings.name")}>{String(company.name ?? "—")}</Row>
            <Row k={t("console.settings.city")}>{String(company.city ?? "—")}</Row>
            <Row k={t("console.settings.email")}>{String(company.email ?? "—")}</Row>
            <Row k={t("console.settings.domain")}>{String(company.domain ?? "—")}</Row>
          </dl>
        </Card>
        <Card>
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
            {t("console.settings.phones")}
          </h2>
          <ul className="mt-3 space-y-1.5 text-[13.5px] tnum text-ink">
            {(Array.isArray(company.phones) ? (company.phones as string[]) : []).map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
          {t("paySettings.title")}
        </h2>
        <p className="mt-1.5 text-[13px] text-ink-3">{t("paySettings.lede")}</p>
        <div className="mt-4">
          <PaymentSettingsForm
            initial={
              (pay as PaymentSettings | null) ?? {
                active_provider: "sim",
                mode: "test",
                fedapay_public_key: null,
                kkiapay_public_key: null,
                stripe_public_key: null,
                currency: "XOF",
                multicurrency_enabled: true,
                fx_rates: { EUR: 655.957, USD: 605, GBP: 770, CAD: 445 },
              }
            }
          />
        </div>
      </Card>

      <Card className="mt-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
          {t("console.settings.legalPages")}
        </h2>
        <p className="mt-2 text-[13px] text-ink-3">{t("console.settings.legalNote")}</p>
      </Card>
    </div>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-3">{k}</dt>
      <dd className="text-right text-ink">{children}</dd>
    </div>
  );
}
