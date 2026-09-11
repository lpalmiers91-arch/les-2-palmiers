"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "motion/react";

/**
 * Image de fond du hero : léger zoom cinématique continu (Ken Burns, CSS —
 * voir .kenburns dans globals.css) + parallax discret au scroll (la photo
 * dérive plus lentement que le contenu, sensation de profondeur). Composant
 * client isolé car useScroll a besoin du DOM ; le reste du hero reste un
 * Server Component.
 */
export function HeroMedia({ src }: { src: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "-8%"]);

  return (
    <div ref={ref} className="absolute inset-0 overflow-hidden">
      {/* le positionnement statique passe par des classes (pas par le `style`
          inline de motion.div) : mélangé à une MotionValue, motion n'applique
          de manière fiable que les propriétés qu'il pilote lui-même (ici `y`
          -> transform) et peut laisser tomber le reste. */}
      <motion.div className="absolute inset-x-0 -top-[8%] -bottom-[8%]" style={{ y }}>
        {/* `fill` exige un ancêtre positionné "ordinaire" (relative + taille
            explicite) : on lui donne ce div classique plutôt que motion.div
            lui-même, pour ne dépendre d'aucune subtilité d'application de
            style par motion. */}
        <div className="relative h-full w-full">
          <Image
            src={src}
            alt=""
            fill
            priority
            sizes="100vw"
            className="kenburns object-cover object-[50%_54%]"
          />
        </div>
      </motion.div>
    </div>
  );
}
