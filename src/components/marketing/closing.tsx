import { Phone } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { ButtonLink } from "@/components/ui/button";
import { site } from "@/lib/site";
import { getT } from "@/lib/i18n";

const cv = (v: unknown, fb: string) => (typeof v === "string" && v.trim() ? v : fb);

export async function Closing({ content = {} }: { content?: Record<string, unknown> }) {
  const { t } = await getT();
  return (
    <section id="contact" className="bg-bone">
      <div className="mx-auto max-w-4xl px-5 py-28 text-center md:px-8 md:py-36">
        <Reveal>
          <p className="display text-[1.9rem] leading-[1.28] text-ink sm:text-[2.5rem]">
            «{" "}
            {cv(
              content.quote,
              `${t("hero.titleA")} ${t("hero.titleB")}… ${t("hero.titleEm")}`,
            )}{" "}
            »
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ButtonLink href="/reserver" data-track="reserver-closing" size="lg" className="w-full sm:w-auto">
              {cv(content.ctaLabel, t("home.closingCta"))}
            </ButtonLink>
            <ButtonLink
              href={`tel:${site.phones[0].replace(/\s/g, "")}`}
              size="lg"
              variant="outline"
              className="w-full sm:w-auto"
            >
              <Phone className="h-4 w-4" strokeWidth={1.8} />
              {site.phones[0]}
            </ButtonLink>
          </div>
          <p className="mt-5 text-[13px] text-ink-3">
            {cv(content.contact, t("home.closingContact"))}{" "}
            <a
              href={`mailto:${site.email}`}
              className="text-ink underline decoration-brass decoration-1 underline-offset-4"
            >
              {site.email}
            </a>
          </p>
        </Reveal>
      </div>
    </section>
  );
}
