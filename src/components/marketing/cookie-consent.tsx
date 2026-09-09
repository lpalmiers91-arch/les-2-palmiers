"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { easeOut } from "@/lib/motion";
import { useT } from "@/lib/i18n/provider";
import { consentDecided, getJSON, setJSON } from "@/lib/prefs";

type Choice = { necessary: true; analytics: boolean; at: string };

/** Choix de consentement, lisible partout via `getJSON("consent")`. */
export function readConsent(): Choice | null {
  return getJSON<Choice>("consent");
}

export function CookieConsent() {
  const { t } = useT();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (consentDecided()) return;
    const id = setTimeout(() => setShow(true), 1400);
    return () => clearTimeout(id);
  }, []);

  function decide(analytics: boolean) {
    setJSON("consent", { necessary: true, analytics, at: new Date().toISOString() });
    setShow(false);
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.38, ease: easeOut }}
          className="fixed inset-x-3 bottom-3 z-[60] mx-auto max-w-2xl sm:bottom-4"
          role="dialog"
          aria-label="Consentement aux cookies"
        >
          <div className="flex flex-col gap-3 rounded-[var(--radius-lg)] bg-ink px-4 py-3.5 text-bone shadow-[0_20px_50px_-18px_rgba(0,0,0,0.6)] sm:flex-row sm:items-center sm:gap-4 sm:px-5">
            <p className="text-center text-[13px] leading-snug text-bone/75 sm:text-left">
              {t("cookie.text")}{" "}
              <Link href="/legal/cookies" className="whitespace-nowrap text-bone/90 underline underline-offset-2">
                {t("cookie.learnMore")}
              </Link>
            </p>
            <div className="flex shrink-0 justify-center gap-2">
              <button
                onClick={() => decide(false)}
                className="press h-9 rounded-full border border-bone/25 px-4 text-[12.5px] font-medium text-bone hover:bg-bone/10"
              >
                {t("cookie.decline")}
              </button>
              <button
                onClick={() => decide(true)}
                className="press h-9 rounded-full bg-brass px-4 text-[12.5px] font-medium text-ink hover:bg-brass-2"
              >
                {t("cookie.accept")}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
