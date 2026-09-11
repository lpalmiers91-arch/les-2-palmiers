import Image from "next/image";
import { getT } from "@/lib/i18n";
import { getHomeBlock, pick, cmsImg } from "@/lib/cms";
import { HeroIn } from "./hero-in";
import { ArrivalSlip } from "./arrival-slip";

export async function Hero() {
  const { t } = await getT();
  const c = await getHomeBlock("hero");

  const stats = Array.isArray(c.stats)
    ? (c.stats as { value: string; label: string }[])
    : [
        { value: "4", label: t("hero.statGuests") },
        { value: "2", label: t("hero.statBedrooms") },
        { value: "10", label: t("hero.statServices") },
        { value: t("hero.availabilityValue"), label: t("hero.statAvailability") },
      ];

  return (
    <section className="relative isolate min-h-[620px] h-[88svh] max-h-[900px] w-full overflow-hidden bg-ink">
      <Image
        src={cmsImg(pick(c.image, "terrace-palms.jpg"))}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover object-[50%_58%]"
      />
      {/* voiles : léger sur toute la surface (lisibilité de l'en-tête) + dégradé bas plus dense */}
      <div aria-hidden className="absolute inset-0 bg-ink/25" />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(22,19,15,0.92) 0%, rgba(22,19,15,0.55) 34%, rgba(22,19,15,0.05) 70%)",
        }}
      />

      <div className="relative z-10 mx-auto flex h-full max-w-6xl flex-col justify-end px-5 pb-11 pt-28 md:px-8 md:pb-16">
        <HeroIn as="p" className="text-[12px] font-medium uppercase tracking-[0.22em] text-bone/70">
          {pick(c.eyebrow, t("hero.eyebrow"))}
        </HeroIn>

        <HeroIn delay={0.05}>
          <h1 className="display mt-4 max-w-3xl text-balance text-[2.5rem] leading-[1.02] text-bone sm:text-[3.2rem] md:text-[3.9rem]">
            {pick(c.titleA, t("hero.titleA"))} {pick(c.titleB, t("hero.titleB"))}
            <span className="mt-1.5 block font-normal italic text-brass-3">
              {pick(c.titleEm, t("hero.titleEm"))}
            </span>
          </h1>
        </HeroIn>

        <HeroIn as="p" delay={0.1} className="mt-5 max-w-lg text-[0.98rem] leading-relaxed text-bone/78">
          {pick(c.lede, t("hero.lede"))}
        </HeroIn>

        <HeroIn delay={0.16} className="mt-8 w-full max-w-[680px]">
          <ArrivalSlip />
        </HeroIn>

        <HeroIn delay={0.24} className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-1.5 text-[12px] text-bone/55">
          {stats.map((s, i) => (
            <span key={i} className="inline-flex items-baseline gap-1.5">
              <span className="tnum font-semibold text-bone/80">{s.value}</span>
              {s.label}
              {i < stats.length - 1 && <span className="ml-4 hidden text-bone/25 sm:inline">·</span>}
            </span>
          ))}
        </HeroIn>
      </div>
    </section>
  );
}
