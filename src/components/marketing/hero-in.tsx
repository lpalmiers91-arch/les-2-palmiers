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
  y = 14,
  scaleFrom,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "h1" | "p" | "span";
  /** distance de départ (px) — 0 pour un élément qui ne doit que fondre/flouter. */
  y?: number;
  /** échelle de départ optionnelle (0.9–0.99) : jamais depuis scale(0), toujours discret. */
  scaleFrom?: number;
}) {
  const M = motion[as];
  return (
    <M
      className={className}
      initial={{ opacity: 0, y, filter: "blur(4px)", ...(scaleFrom ? { scale: scaleFrom } : {}) }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)", ...(scaleFrom ? { scale: 1 } : {}) }}
      transition={{ duration: 0.7, ease: easeOut, delay }}
    >
      {children}
    </M>
  );
}

/**
 * Révélation "rideau" pour une ligne de titre : le texte monte depuis sous
 * un masque (overflow-hidden), plutôt qu'un simple fondu — effet éditorial
 * (repéré sur transitions.dev : "lines rise with offset stagger"), sans
 * artifice superflu. Un seul enfant textuel/inline attendu.
 */
export function HeroLine({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <span className={`block overflow-hidden ${className ?? ""}`}>
      <motion.span
        className="block"
        initial={{ y: "112%" }}
        animate={{ y: "0%" }}
        transition={{ duration: 0.9, ease: easeOut, delay }}
      >
        {children}
      </motion.span>
    </span>
  );
}

/** Trait signature qui se "dessine" (scaleX) — petite touche éditoriale près de l'eyebrow. */
export function HeroRule({ delay = 0, className }: { delay?: number; className?: string }) {
  return (
    <motion.span
      aria-hidden
      className={`block h-px origin-left bg-brass-3/70 ${className ?? ""}`}
      initial={{ scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: 0.8, ease: easeOut, delay }}
    />
  );
}
