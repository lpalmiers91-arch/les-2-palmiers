"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/track";

/**
 * Suivi des pages vues (après consentement) + délégation des clics sur les
 * éléments marqués `data-track="nom"`.
 */
export function Analytics() {
  const pathname = usePathname();

  useEffect(() => {
    track("page_view", {}, pathname);
  }, [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      const el = (e.target as HTMLElement | null)?.closest?.("[data-track]") as HTMLElement | null;
      if (!el) return;
      track("cta_click", { name: el.dataset.track, label: el.textContent?.trim().slice(0, 60) });
    }
    document.addEventListener("click", onClick, { capture: true });
    return () => document.removeEventListener("click", onClick, { capture: true });
  }, []);

  // page de sortie : dernière page vue avant de quitter l'onglet
  useEffect(() => {
    let sent = false;
    function leave() {
      if (sent) return;
      sent = true;
      track("page_leave", {}, window.location.pathname);
    }
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") leave();
    });
    window.addEventListener("pagehide", leave);
    return () => {
      window.removeEventListener("pagehide", leave);
    };
  }, []);

  return null;
}
