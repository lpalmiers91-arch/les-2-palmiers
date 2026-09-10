import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";
import { listApartments } from "@/lib/apartments";
import { ApartmentCard } from "./apartment-card";
import { getT } from "@/lib/i18n";

const s = (v: unknown, fb: string) => (typeof v === "string" && v.trim() ? v : fb);

export async function ApartmentsPreview({ content = {} }: { content?: Record<string, unknown> }) {
  const { t } = await getT();
  const apts = await listApartments();
  if (apts.length === 0) return null;

  return (
    <section id="appartement" className="bg-bone-2">
      <div className="mx-auto max-w-6xl px-5 py-24 md:px-8 md:py-32">
        <Reveal className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-xl">
            <h2 className="display text-[2.1rem] leading-[1.06] text-ink sm:text-[2.7rem]">
              {s(content.title, t("aptPub.previewTitle"))}
              <br />
              <span className="italic font-normal text-forest-2">
                {s(content.titleEm, t("aptPub.previewTitleEm"))}
              </span>
            </h2>
            <p className="measure mt-6 text-[1.02rem] leading-relaxed text-ink-2">
              {s(
                content.lede,
                t("aptPub.previewLede"),
              )}
            </p>
          </div>
          <Link
            href="/appartements"
            className="press inline-flex items-center gap-1.5 text-[13.5px] font-medium text-forest-2 hover:text-forest"
          >
            {t("aptPub.viewAll")} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </Reveal>

        <Reveal className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {apts.slice(0, 3).map((apt) => (
            <ApartmentCard key={apt.id} apt={apt} />
          ))}
        </Reveal>
      </div>
    </section>
  );
}
