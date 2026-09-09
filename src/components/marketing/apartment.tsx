import Image from "next/image";
import { Reveal } from "@/components/ui/reveal";
import { amenitiesFallback, aptImg } from "@/lib/site";
import { getT } from "@/lib/i18n";

const gallery = [
  { src: aptImg("balcony-view.jpg"), alt: "Balcon à balustrade avec palmier en pot et vue sur l'océan" },
  { src: aptImg("g-27.jpg"), alt: "Chambre avec lit à tête capitonnée et linge à motif palme" },
  { src: aptImg("g-14.jpg"), alt: "Cuisine équipée, plan de travail clair et crédence sombre" },
  { src: aptImg("g-20.jpg"), alt: "Terrasse ombragée, palmier et bougainvilliers en fleurs" },
];

const s = (v: unknown, fb: string) => (typeof v === "string" && v.trim() ? v : fb);

export async function Apartment({ content = {} }: { content?: Record<string, unknown> }) {
  const { t } = await getT();
  return (
    <section id="appartement" className="bg-bone-2">
      <div className="mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32">
        <Reveal className="max-w-xl">
          <h2 className="display text-[2.1rem] leading-[1.06] text-ink sm:text-[2.7rem]">
            {s(content.title, t("home.apartmentTitle"))}
            <br />
            <span className="italic font-normal text-forest-2">
              {s(content.titleEm, t("home.apartmentTitleEm"))}
            </span>
          </h2>
          <p className="measure mt-6 text-[1.02rem] leading-relaxed text-ink-2">
            {s(content.lede, t("home.apartmentLede"))}
          </p>
        </Reveal>

        <Reveal className="mt-12 grid gap-3 sm:grid-cols-12 sm:gap-4">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-lg)] ring-1 ring-ink/10 sm:col-span-7">
            <Image
              src={aptImg("rooftop-ocean.jpg")}
              alt="Vue depuis la terrasse : toits de Cotonou, palmiers et océan à l'horizon"
              fill
              sizes="(max-width: 640px) 100vw, 55vw"
              className="object-cover"
            />
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-lg)] ring-1 ring-ink/10 sm:col-span-5 sm:aspect-auto">
            <Image
              src={aptImg("g-08.jpg")}
              alt="Façade de la villa en terre cuite, balcons à balustrade et ciel de traîne"
              fill
              sizes="(max-width: 640px) 100vw, 40vw"
              className="object-cover"
            />
          </div>
          {gallery.map((g) => (
            <div
              key={g.src}
              className="relative aspect-square overflow-hidden rounded-[var(--radius-card)] ring-1 ring-ink/10 sm:col-span-3"
            >
              <Image src={g.src} alt={g.alt} fill sizes="(max-width: 640px) 50vw, 24vw" className="object-cover" />
            </div>
          ))}
        </Reveal>

        <div className="mt-14 grid gap-x-12 gap-y-10 border-t border-ink/15 pt-10 md:grid-cols-[1.4fr_1fr]">
          <Reveal>
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.18em] text-ink-3">
              {t("home.apartmentWhatsThere")}
            </h3>
            <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {amenitiesFallback.map((a) => (
                <li key={a.key} className="flex items-baseline justify-between gap-4 border-b border-line-soft pb-2.5">
                  <span className="text-[15px] text-ink">{a.label}</span>
                  <span className="text-right text-[12.5px] text-ink-3">{a.detail}</span>
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={0.08}>
            <h3 className="text-[13px] font-semibold uppercase tracking-[0.18em] text-ink-3">
              {t("home.apartmentGoodToKnow")}
            </h3>
            <dl className="mt-5 space-y-3 text-[14px]">
              {[
                [t("home.kArrival"), t("home.vArrival")],
                [t("home.kDeparture"), t("home.vDeparture")],
                [t("home.kCapacity"), t("home.vCapacity")],
                [t("home.kCancellation"), t("home.vCancellation")],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-line-soft pb-2.5">
                  <dt className="text-ink-3">{k}</dt>
                  <dd className="text-right text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
