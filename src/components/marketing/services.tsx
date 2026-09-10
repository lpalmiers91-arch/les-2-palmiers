import { Reveal } from "@/components/ui/reveal";
import { ServiceIcon } from "./service-icon";
import { servicesFallback, formatXOF, type ServiceFallback } from "@/lib/site";
import { getT } from "@/lib/i18n";

function priceLabel(s: ServiceFallback, t: (k: string, v?: Record<string, string | number>) => string) {
  if (s.pricing_mode === "fixed" && s.base_price)
    return t("home.priceFrom", { price: formatXOF(s.base_price) });
  if (s.pricing_mode === "metered") return t("home.priceMetered");
  return t("home.priceQuote");
}

const sv = (v: unknown, fb: string) => (typeof v === "string" && v.trim() ? v : fb);

export async function Services({ content = {} }: { content?: Record<string, unknown> }) {
  const { t, tList } = await getT();
  const tr = tList<{ slug: string; title: string; description: string }>("home.servicesList");
  const items = servicesFallback.map((s) => {
    const m = tr.find((x) => x.slug === s.slug);
    return { ...s, title: m?.title ?? s.title, description: m?.description ?? s.description };
  });
  return (
    <section id="services" className="bg-bone">
      <div className="mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <Reveal className="lg:sticky lg:top-28 lg:self-start">
            <h2 className="display text-[2.1rem] leading-[1.06] text-ink sm:text-[2.7rem]">
              {sv(content.title, t("home.servicesTitle"))}
              <br />
              <span className="italic font-normal text-forest-2">
                {sv(content.titleEm, t("home.servicesTitleEm"))}
              </span>
            </h2>
            <p className="measure mt-6 text-[1.02rem] leading-relaxed text-ink-2">
              {sv(content.lede, t("home.servicesLede"))}
            </p>
          </Reveal>

          <Reveal as="ul" className="-mt-2">
            {items.map((s) => (
              <li
                key={s.slug}
                className="grid grid-cols-[auto_1fr_auto] items-start gap-4 border-b border-line py-5 sm:gap-6"
              >
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bone-2 text-forest-2">
                  <ServiceIcon name={s.icon} />
                </span>
                <span className="min-w-0">
                  <span className="display block text-[1.15rem] text-ink">{s.title}</span>
                  <span className="mt-1 block text-[14px] leading-snug text-ink-3">{s.description}</span>
                </span>
                <span className="mt-1 whitespace-nowrap text-right text-[12.5px] font-medium text-ink-2">
                  {priceLabel(s, t)}
                </span>
              </li>
            ))}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
