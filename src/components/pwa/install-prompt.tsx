"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Download, Share, X, Plus } from "lucide-react";
import { Mark } from "@/components/brand/mark";
import { easeOut } from "@/lib/motion";
import { useT } from "@/lib/i18n/provider";
import { consentDecided, getPref, setPref } from "@/lib/prefs";

const SEEN_KEY = "install-seen"; // affiché une fois -> plus jamais en auto

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // @ts-expect-error iOS
    window.navigator.standalone === true
  );
}
function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
}

export function InstallPrompt() {
  const { t } = useT();
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [show, setShow] = useState(false);
  const [mode, setMode] = useState<"android" | "ios">("android");

  useEffect(() => {
    // enregistre le service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    // affiché une seule fois en auto ; ensuite plus jamais (l'utilisateur peut
    // toujours installer via le menu du navigateur / les réglages).
    if (getPref(SEEN_KEY) === "1" || isStandalone()) return;

    const timers: number[] = [];
    // attend la décision cookies avant de se montrer, puis marque "vu"
    function scheduleShow(delay: number) {
      const first = window.setTimeout(function tick() {
        if (consentDecided()) {
          setShow(true);
          setPref(SEEN_KEY, "1");
        } else {
          const again = window.setTimeout(tick, 1200);
          timers.push(again);
        }
      }, delay);
      timers.push(first);
    }

    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setMode("android");
      scheduleShow(6000);
    };
    window.addEventListener("beforeinstallprompt", onBIP);

    // iOS : pas d'événement, on propose les instructions
    if (isIOS()) {
      setMode("ios");
      scheduleShow(7000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  function close() {
    setShow(false);
    setPref(SEEN_KEY, "1");
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    close();
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.4, ease: easeOut }}
          className="fixed inset-x-3 bottom-3 z-[65] mx-auto max-w-md sm:bottom-5"
          role="dialog"
          aria-label="Installer l'application"
        >
          <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-4 shadow-[0_24px_60px_-20px_rgba(23,19,13,0.4)]">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-forest">
                <Mark className="h-6 w-6" tone="bone" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium text-ink">{t("install.title")}</p>
                {mode === "android" ? (
                  <p className="mt-0.5 text-[12.5px] text-ink-3">{t("install.bodyAndroid")}</p>
                ) : (
                  <p className="mt-0.5 flex flex-wrap items-center gap-1 text-[12.5px] leading-relaxed text-ink-3">
                    <Share className="inline h-3.5 w-3.5" /> {t("install.bodyIos")}{" "}
                    <Plus className="inline h-3.5 w-3.5" />
                  </p>
                )}
              </div>
              <button onClick={close} aria-label={t("nav.close")} className="press -mr-1 -mt-1 p-1 text-ink-3">
                <X className="h-4 w-4" />
              </button>
            </div>
            {mode === "android" && (
              <button
                onClick={install}
                className="press mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-ink text-[13px] font-medium text-bone hover:bg-forest-2"
              >
                <Download className="h-4 w-4" /> {t("install.install")}
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
