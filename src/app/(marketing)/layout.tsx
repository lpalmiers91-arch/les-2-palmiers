import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { CookieConsent } from "@/components/marketing/cookie-consent";
import { SmoothScroll } from "@/components/marketing/smooth-scroll";
import { PublicAssistant } from "@/components/assistant/public-assistant";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { I18nProvider } from "@/lib/i18n/provider";
import { getLocale, getMessages } from "@/lib/i18n";
import { getBranding, getNavPages } from "@/lib/cms";
import { aiSpaceEnabled } from "@/lib/ai";
import { JsonLd, organizationLd } from "@/components/seo/json-ld";
import { CurrencyProvider } from "@/lib/currency";
import { getFxConfig } from "@/lib/fx";

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages(locale);
  const [branding, navPages, aiOn, fx] = await Promise.all([
    getBranding(),
    getNavPages(),
    aiSpaceEnabled("public"),
    getFxConfig(),
  ]);
  return (
    <I18nProvider locale={locale} messages={messages}>
      <CurrencyProvider rates={fx.rates} enabled={fx.enabled}>
        <JsonLd data={organizationLd()} />
        <MotionConfig reducedMotion="user">
          <SmoothScroll />
          <SiteHeader
            wordmark={branding.wordmark}
            logoUrl={branding.logo_url}
            navExtra={navPages}
          />
          <main id="main-content">{children}</main>
          <SiteFooter />
          <CookieConsent />
          {aiOn && <PublicAssistant />}
          <InstallPrompt />
        </MotionConfig>
      </CurrencyProvider>
    </I18nProvider>
  );
}
