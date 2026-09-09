import Image from "next/image";
import { aptImg } from "@/lib/site";
import { getT } from "@/lib/i18n";
import { ArrivalSlip } from "./arrival-slip";

export async function Hero() {
  const { t } = await getT();
  return (
    <section className="grain relative overflow-hidden bg-forest text-bone">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-[-12%] h-[560px] w-[560px] rounded-full opacity-40"
        style={{
          background:
            "radial-gradient(closest-side, rgba(230,197,139,0.20), transparent 70%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-[112px] md:px-8 md:pb-24 md:pt-[128px]">
        <div className="grid items-start gap-x-14 gap-y-10 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="lg:pt-6">
            <p className="text-[13px] font-medium tracking-tight text-sand">{t("hero.eyebrow")}</p>
            <h1 className="display mt-5 text-[2.6rem] leading-[1.04] sm:text-[3.1rem] md:text-[3.5rem]">
              {t("hero.titleA")} {t("hero.titleB")}
              <span className="mt-2 block text-[1.9rem] font-normal italic text-brass-3 sm:text-[2.2rem] md:text-[2.5rem]">
                {t("hero.titleEm")}
              </span>
            </h1>
            <p className="measure mt-7 text-[1.03rem] leading-relaxed text-bone/75">{t("hero.lede")}</p>

            <dl className="mt-9 flex flex-wrap gap-x-9 gap-y-4 text-[13px]">
              {[
                ["4", t("hero.statGuests")],
                ["2", t("hero.statBedrooms")],
                ["10", t("hero.statServices")],
                [t("hero.availabilityValue"), t("hero.statAvailability")],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="tnum display text-[1.25rem] text-bone">{v}</dt>
                  <dd className="mt-0.5 text-bone/55">{l}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative flex flex-col items-center lg:items-end">
            <div className="relative aspect-[3/4] max-h-[500px] w-full max-w-[420px] overflow-hidden rounded-[var(--radius-lg)] ring-1 ring-bone/15">
              <Image
                src={aptImg("terrace-palms.jpg")}
                alt="La terrasse à colonnes de l'appartement : deux palmiers, un mur de bougainvilliers, l'océan au loin"
                fill
                priority
                sizes="(max-width: 1024px) 90vw, 440px"
                className="object-cover object-[50%_78%]"
              />
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(to top, rgba(18,28,22,0.45), transparent 40%)",
                }}
              />
            </div>

            <div className="z-10 -mt-14 w-full max-w-sm px-1 sm:-mt-16 sm:px-0">
              <ArrivalSlip />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
