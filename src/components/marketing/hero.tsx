import { getT } from "@/lib/i18n";
import { getHomeBlock, pick, cmsImg } from "@/lib/cms";
import { HeroIn, HeroLine, HeroRule } from "./hero-in";
import { HeroMedia } from "./hero-media";
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
    <section className="grain relative isolate flex min-h-[640px] w-full flex-col overflow-hidden bg-ink sm:min-h-[86svh]">
      <HeroMedia src={cmsImg(pick(c.image, "terrace-palms.jpg"))} />
      {/* voiles : base + dégradé bas + dégradé gauche (colonne de texte) */}
      <div aria-hidden className="absolute inset-0 bg-ink/35" />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(22,19,15,0.94) 4%, rgba(22,19,15,0.5) 42%, rgba(22,19,15,0.12) 78%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to right, rgba(22,19,15,0.62) 0%, rgba(22,19,15,0.18) 52%, transparent 78%)",
        }}
      />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-end px-5 pb-10 pt-28 md:px-8 md:pb-16">
        <HeroIn as="div" y={6} className="flex items-center gap-3">
          <HeroRule delay={0.15} className="w-7 sm:w-9" />
          <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-bone/65 sm:text-[12px] sm:tracking-[0.22em]">
            {pick(c.eyebrow, t("hero.eyebrow"))}
          </span>
        </HeroIn>

        <h1 className="display mt-3.5 max-w-3xl text-balance text-[2.05rem] leading-[1.04] text-bone sm:text-[3rem] sm:leading-[1.02] md:text-[3.8rem]">
          <HeroLine delay={0.08}>
            {pick(c.titleA, t("hero.titleA"))} {pick(c.titleB, t("hero.titleB"))}
          </HeroLine>
          <HeroLine
            delay={0.18}
            className="mt-1.5 text-[1.45rem] font-normal text-brass-3 sm:text-[1.9rem] md:text-[2.4rem]"
          >
            {pick(c.titleEm, t("hero.titleEm"))}
          </HeroLine>
        </h1>

        <HeroIn as="p" delay={0.32} className="mt-4 hidden max-w-lg text-[0.98rem] leading-relaxed text-bone/78 sm:block">
          {pick(c.lede, t("hero.lede"))}
        </HeroIn>

        <HeroIn delay={0.4} scaleFrom={0.985} className="mt-7 w-full max-w-[700px]">
          <ArrivalSlip />
        </HeroIn>

        <HeroIn delay={0.48} className="mt-5 hidden flex-wrap items-center gap-x-7 gap-y-1.5 text-[12px] text-bone/55 sm:flex">
          {stats.map((s, i) => (
            <span key={i} className="inline-flex items-baseline gap-1.5">
              <span className="tnum font-semibold text-bone/80">{s.value}</span>
              {s.label}
              {i < stats.length - 1 && <span className="ml-3 text-bone/25">·</span>}
            </span>
          ))}
        </HeroIn>
      </div>
    </section>
  );
}
