import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Mark } from "@/components/brand/mark";
import { ReservationFunnel } from "@/components/reserve/funnel";
import { site } from "@/lib/site";
import { I18nProvider } from "@/lib/i18n/provider";
import { getLocale, getMessages } from "@/lib/i18n";
import { CurrencyProvider } from "@/lib/currency";
import { getFxConfig } from "@/lib/fx";

export const metadata: Metadata = { title: "Réserver" };

export default async function ReservePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const locale = await getLocale();
  const messages = await getMessages(locale);
  const fx = await getFxConfig();

  return (
    <I18nProvider locale={locale} messages={messages}>
    <CurrencyProvider rates={fx.rates} enabled={fx.enabled}>
    <div className="min-h-dvh bg-bone-2">
      <header className="border-b border-line bg-bone">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5 text-ink">
            <Mark className="h-7 w-7" tone="ink" />
            <span className="display text-[1.02rem]">Les 2 Palmiers</span>
          </Link>
          <a
            href={`tel:${site.phones[0].replace(/\s/g, "")}`}
            className="inline-flex items-center gap-2 text-[13px] font-medium text-ink-2 hover:text-ink"
          >
            <Phone className="h-4 w-4" strokeWidth={1.7} />
            <span className="hidden sm:inline">{site.phones[0]}</span>
            <span className="sm:hidden">Aide</span>
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <Suspense>
          <ReservationFunnel authed={!!user} />
        </Suspense>
      </div>
    </div>
    </CurrencyProvider>
    </I18nProvider>
  );
}
