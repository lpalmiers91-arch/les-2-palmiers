"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Bell, BellRing, X } from "lucide-react";
import { easeOut } from "@/lib/motion";
import { enablePush, pushSupported, syncPushIfGranted } from "@/lib/push";
import { consentDecided, getPref, setPref } from "@/lib/prefs";

const SEEN_KEY = "push-seen"; // invite affichée une fois -> plus jamais en auto

/**
 * Active les notifications push (sonnerie / vibration / écran verrouillé).
 * - permission déjà accordée : ré-enregistre l'abonnement en silence
 * - permission par défaut : propose une invite discrète (geste requis par le navigateur)
 */
export function PushSetup() {
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!pushSupported()) return;

    if (Notification.permission === "granted") {
      void syncPushIfGranted();
      return;
    }
    if (Notification.permission === "denied") return;
    if (getPref(SEEN_KEY) === "1") return;

    const timers: number[] = [];
    const first = window.setTimeout(function tick() {
      if (consentDecided()) {
        setShow(true);
        setPref(SEEN_KEY, "1");
      } else {
        const again = window.setTimeout(tick, 1500);
        timers.push(again);
      }
    }, 9000);
    timers.push(first);

    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  function close() {
    setShow(false);
    setPref(SEEN_KEY, "1");
  }

  async function activate() {
    setBusy(true);
    const res = await enablePush();
    setBusy(false);
    if (res.ok) {
      setDone(true);
      setTimeout(() => setShow(false), 1600);
    } else {
      // refus ou non supporté : on n'insiste pas
      close();
    }
  }

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.4, ease: easeOut }}
          className="fixed inset-x-3 bottom-3 z-[64] mx-auto max-w-md sm:bottom-5"
          role="dialog"
          aria-label="Activer les notifications"
        >
          <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-4 shadow-[0_24px_60px_-20px_rgba(23,19,13,0.4)]">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-forest">
                {done ? (
                  <BellRing className="h-5 w-5 text-bone" />
                ) : (
                  <Bell className="h-5 w-5 text-bone" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-medium text-ink">
                  {done ? "Notifications activées" : "Activer les notifications"}
                </p>
                <p className="mt-0.5 text-[12.5px] text-ink-3">
                  {done
                    ? "Vous serez prévenu même écran verrouillé."
                    : "Messages, réservations, paiements — sur votre écran, même verrouillé."}
                </p>
              </div>
              {!done && (
                <button
                  onClick={close}
                  aria-label="Fermer"
                  className="press -mr-1 -mt-1 p-1 text-ink-3"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            {!done && (
              <button
                onClick={activate}
                disabled={busy}
                className="press mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-ink text-[13px] font-medium text-bone hover:bg-forest-2 disabled:opacity-60"
              >
                <Bell className="h-4 w-4" />
                {busy ? "Activation…" : "Activer"}
              </button>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
