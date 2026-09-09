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

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages(locale);
  return (
    <I18nProvider locale={locale} messages={messages}>
      <MotionConfig reducedMotion="user">
        <SmoothScroll />
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
        <CookieConsent />
        <PublicAssistant />
        <InstallPrompt />
      </MotionConfig>
    </I18nProvider>
  );
}
