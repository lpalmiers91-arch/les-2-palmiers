"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { easeOut, viewportOnce } from "@/lib/motion";

/**
 * Révélation au scroll. L'état `initial` ne dépend d'aucun hook client :
 * SSR et hydratation rendent le même markup. `MotionConfig reducedMotion="user"`
 * (dans le layout) neutralise le déplacement pour qui préfère moins d'animation.
 */
export function Reveal({
  children,
  delay = 0,
  y = 18,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "span" | "li" | "ul" | "ol" | "section";
}) {
  const M = motion[as];
  return (
    <M
      className={className}
      initial={{ opacity: 0, y, filter: "blur(4px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={viewportOnce}
      transition={{ duration: 0.7, ease: easeOut, delay }}
    >
      {children}
    </M>
  );
}
