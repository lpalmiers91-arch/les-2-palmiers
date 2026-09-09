"use client";

import { motion } from "motion/react";
import { easeOut } from "@/lib/motion";
import { Reveal } from "@/components/ui/reveal";
import { useT } from "@/lib/i18n/provider";

const ledger = [
  { t: "07:30", s: "Petit-déjeuner déposé", d: "café, pain, fruits de saison" },
  { t: "09:00", s: "Ménage complet", d: "chambres, cuisine, terrasse" },
  { t: "10:15", s: "Voiture avec chauffeur", d: "journée à Ouidah" },
  { t: "13:00", s: "Coiffure à domicile", d: "tresses, deux personnes" },
  { t: "16:30", s: "Recharge & transaction", d: "MTN, transfert reçu" },
  { t: "19:00", s: "Cuisinier privé", d: "dîner ouest-africain, pour 4" },
  { t: "21:30", s: "Massage relaxant", d: "60 min, sur place" },
];

const parent = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const child = {
  hidden: { opacity: 0, x: -14, filter: "blur(3px)" },
  show: { opacity: 1, x: 0, filter: "blur(0px)", transition: { duration: 0.55, ease: easeOut } },
};

export function Concierge() {
  const { t } = useT();
  return (
    <section className="grain relative overflow-hidden bg-ink text-bone">
      <div className="mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32">
        <div className="grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <Reveal className="lg:sticky lg:top-28 lg:self-start">
            <h2 className="display text-[2.1rem] leading-[1.06] sm:text-[2.7rem]">
              {t("home.conciergeTitle")}
              <span className="mt-1 block italic font-normal text-brass-3">
                {t("home.conciergeTitleEm")}
              </span>
            </h2>
            <p className="measure mt-6 text-[1.02rem] leading-relaxed text-bone/70">
              {t("home.conciergeLede")}
            </p>
            <p className="mt-8 text-[13px] text-bone/45">{t("home.conciergeCaption")}</p>
          </Reveal>

          <motion.ol
            variants={parent}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.15 }}
            className="relative border-l border-line-dark pl-6 sm:pl-8"
          >
            {ledger.map((row) => (
              <motion.li key={row.t} variants={child} className="relative pb-8 last:pb-0">
                <span
                  aria-hidden
                  className="absolute -left-[calc(1.5rem+4.5px)] top-1.5 h-2 w-2 rounded-full bg-brass-2 sm:-left-[calc(2rem+4.5px)]"
                />
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="tnum text-[13px] font-medium text-brass-3">{row.t}</span>
                  <span className="display text-[1.15rem] text-bone">{row.s}</span>
                </div>
                <p className="mt-1 text-[14px] text-bone/55">{row.d}</p>
              </motion.li>
            ))}
          </motion.ol>
        </div>
      </div>
    </section>
  );
}
