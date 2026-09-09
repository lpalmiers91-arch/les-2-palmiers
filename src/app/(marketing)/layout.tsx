"use client";

import type { ReactNode } from "react";
import { MotionConfig } from "motion/react";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { CookieConsent } from "@/components/marketing/cookie-consent";
import { SmoothScroll } from "@/components/marketing/smooth-scroll";
import { PublicAssistant } from "@/components/assistant/public-assistant";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <SmoothScroll />
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
      <CookieConsent />
      <PublicAssistant />
    </MotionConfig>
  );
}
