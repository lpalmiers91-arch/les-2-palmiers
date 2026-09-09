"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { easeOut } from "@/lib/motion";

const KEY = "l2p-consent-v1";
type Choice = { necessary: true; analytics: boolean; at: string };

/** Lit le choix depuis le cookie OU le localStorage (l'un des deux suffit). */
function storedChoice(): Choice | null {
  try {
    const m = document.cookie.match(/(?:^|;\s*)l2p_consent=([^;]+)/);
    if (m) return JSON.parse(decodeURIComponent(m[1])) as Choice;
  } catch {
    /* ignore */
  }
  try {
    const v = localStorage.getItem(KEY);
    if (v) return JSON.parse(v) as Choice;
  } catch {
    /* ignore */
  }
  return null;
}

function persist(c: Choice) {
  const v = encodeURIComponent(JSON.stringify(c));
  try {
    // cookie : robuste même quand le localStorage est bridé (Safari privé, iOS)
    document.cookie = `l2p_consent=${v}; path=/; max-age=${60 * 60 * 24 * 180}; samesite=lax`;
  } catch {
    /* ignore */
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(c));
  } catch {
    /* ignore */
  }
}

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (storedChoice()) return;
    const t = setTimeout(() => setShow(true), 1600);
    return () => clearTimeout(t);
  }, []);

  function decide(analytics: boolean) {
    persist({ necessary: true, analytics, at: new Date().toISOString() });
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
              Cookies nécessaires au fonctionnement. Avec votre accord, une mesure
              d&apos;audience anonyme.{" "}
              <Link href="/legal/cookies" className="whitespace-nowrap text-bone/90 underline underline-offset-2">
                En savoir plus
              </Link>
            </p>
            <div className="flex shrink-0 justify-center gap-2">
              <button
                onClick={() => decide(false)}
                className="press h-9 rounded-full border border-bone/25 px-4 text-[12.5px] font-medium text-bone hover:bg-bone/10"
              >
                Refuser
              </button>
              <button
                onClick={() => decide(true)}
                className="press h-9 rounded-full bg-brass px-4 text-[12.5px] font-medium text-ink hover:bg-brass-2"
              >
                Accepter
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
