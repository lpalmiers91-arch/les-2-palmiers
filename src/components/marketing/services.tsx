import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { ServiceIcon } from "./service-icon";
import { servicesFallback, formatXOF, type ServiceFallback } from "@/lib/site";

function priceLabel(s: ServiceFallback) {
  if (s.pricing_mode === "fixed" && s.base_price) return `dès ${formatXOF(s.base_price)}`;
  if (s.pricing_mode === "metered") return "au réel";
  return "sur devis";
}

export function Services() {
  return (
    <section id="services" className="bg-bone">
      <div className="mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <Reveal className="lg:sticky lg:top-28 lg:self-start">
            <h2 className="display text-[2.1rem] leading-[1.06] text-ink sm:text-[2.7rem]">
              Dix façons de vous
              <br />
              <span className="italic font-normal text-forest-2">
                simplifier le séjour.
              </span>
            </h2>
            <p className="measure mt-6 text-[1.02rem] leading-relaxed text-ink-2">
              Réservez un service au moment de la réservation, ou plus tard depuis
              votre espace. Prix fixe quand c'est possible, devis clair sinon.
            </p>
            <Link
              href="/services"
              className="mt-7 inline-flex items-center gap-1.5 text-[14px] font-medium text-ink underline decoration-brass decoration-1 underline-offset-4 hover:decoration-2"
            >
              Voir le détail des services
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Reveal>

          <Reveal as="ul" className="-mt-2">
            {servicesFallback.map((s) => (
              <li key={s.slug}>
                <Link
                  href={`/services#${s.slug}`}
                  className="group grid grid-cols-[auto_1fr_auto] items-start gap-4 border-b border-line py-5 transition-colors hover:bg-ink/[0.025] sm:gap-6"
                >
                  <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bone-2 text-forest-2 transition-colors duration-200 group-hover:bg-forest group-hover:text-bone">
                    <ServiceIcon name={s.icon} />
                  </span>
                  <span className="min-w-0">
                    <span className="display block text-[1.15rem] text-ink">{s.title}</span>
                    <span className="mt-1 block text-[14px] leading-snug text-ink-3">
                      {s.description}
                    </span>
                  </span>
                  <span className="mt-1 whitespace-nowrap text-right text-[12.5px] font-medium text-ink-2">
                    {priceLabel(s)}
                  </span>
                </Link>
              </li>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
