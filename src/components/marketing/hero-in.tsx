"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import { easeOut } from "@/lib/motion";

/**
 * Entrée du hero : joue au montage (pas d'observateur de scroll), donc le
 * contenu n'est jamais bloqué à opacity:0. `MotionConfig reducedMotion="user"`
 * (layout racine) neutralise le déplacement au besoin.
 */
export function HeroIn({
  children,
  delay = 0,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "h1" | "p" | "span";
}) {
  const M = motion[as];
  return (
    <M
      className={className}
      initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.7, ease: easeOut, delay }}
    >
      {children}
    </M>
  );
}
