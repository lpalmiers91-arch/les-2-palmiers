"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Remet la vue en haut à chaque changement de route.
 * Next réinitialise déjà le scroll fenêtre sur la plupart des navigations, mais pas
 * toujours quand il y a des transitions animées ou un focus déplacé — on force ici,
 * fenêtre + éventuel conteneur de défilement interne, sans animation.
 */
export function ScrollToTop() {
  const pathname = usePathname();

  useEffect(() => {
    const el = document.scrollingElement || document.documentElement;
    el.scrollTo({ top: 0, left: 0, behavior: "auto" });
    document
      .querySelectorAll<HTMLElement>("[data-scroll-root]")
      .forEach((n) => n.scrollTo({ top: 0, left: 0, behavior: "auto" }));
  }, [pathname]);

  return null;
}
