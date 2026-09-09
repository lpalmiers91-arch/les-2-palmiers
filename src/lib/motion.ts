import type { Variants, Transition } from "motion/react";

// Courbes fortes (emil / easing.dev)
export const easeOut = [0.23, 1, 0.32, 1] as const;
export const easeInOut = [0.77, 0, 0.175, 1] as const;

export const spring: Transition = { type: "spring", stiffness: 260, damping: 30, mass: 0.9 };

/** Révélation au scroll, depuis un état déjà visuellement plausible. */
export const revealUp: Variants = {
  hidden: { opacity: 0, y: 18, filter: "blur(4px)" },
  show: {
    opacity: 1,
    y: 0,
    filter: "blur(0px)",
    transition: { duration: 0.7, ease: easeOut },
  },
};

export const staggerParent: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

export const viewportOnce = { once: true, margin: "-12% 0px -12% 0px" } as const;
