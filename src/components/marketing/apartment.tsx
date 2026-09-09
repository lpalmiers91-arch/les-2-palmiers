import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { amenitiesFallback } from "@/lib/site";

const gallery = [
  { src: "/apartment/balcony-view.jpg", alt: "Balcon à balustrade avec palmier en pot et vue sur l'océan" },
  { src: "/apartment/g-27.jpg", alt: "Chambre avec lit à tête capitonnée et linge à motif palme" },
  { src: "/apartment/g-14.jpg", alt: "Cuisine équipée, plan de travail clair et crédence sombre" },
  { src: "/apartment/g-20.jpg", alt: "Terrasse ombragée, palmier et bougainvilliers en fleurs" },
];

export function Apartment() {
  return (
    <section id="appartement" className="bg-bone-2">
      <div className="mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32">
        <Reveal className="max-w-xl">
          <h2 className="display text-[2.1rem] leading-[1.06] text-ink sm:text-[2.7rem]">
            L'appartement,
            <br />
            <span className="italic font-normal text-forest-2">au calme, en hauteur.</span>
          </h2>
          <p className="measure mt-6 text-[1.02rem] leading-relaxed text-ink-2">
            Deux chambres, deux salles d'eau, un séjour ouvert et une terrasse à
            colonnes qui donne sur les toits et l'océan. Tout est prêt : vous
            posez vos valises, rien d'autre.
          </p>
        </Reveal>

        <Reveal className="mt-12 grid gap-3 sm:grid-cols-12 sm:gap-4">
          <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-lg)] ring-1 ring-ink/10 sm:col-span-7">
            <Image
              src="/apartment/rooftop-ocean.jpg"
              alt="Vue depuis la terrasse : toits de Cotonou, palmiers et océan à l'horizon"
              fill
              sizes="(max-width: 640px) 100vw, 55vw"
              className="object-cover"
            />
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-[var(--radius-lg)] ring-1 ring-ink/10 sm:col-span-5 sm:aspect-auto">
            <Image
              src="/apartment/g-08.jpg"
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
              Ce qui est là
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
              Bon à savoir
            </h3>
            <dl className="mt-5 space-y-3 text-[14px]">
              {[
                ["Arrivée", "à partir de 14 h 00"],
                ["Départ", "avant 11 h 00"],
                ["Capacité", "4 voyageurs"],
                ["Annulation", "modérée, gratuite jusqu'à quelques jours avant"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-line-soft pb-2.5">
                  <dt className="text-ink-3">{k}</dt>
                  <dd className="text-right text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            <Link
              href="/appartement"
              className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-medium text-ink underline decoration-brass decoration-1 underline-offset-4 hover:decoration-2"
            >
              Voir toutes les photos
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
