import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Home } from "lucide-react";
import { Mark } from "@/components/brand/mark";
import { getT } from "@/lib/i18n";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Page introuvable",
  robots: { index: false, follow: false },
};

export default async function NotFound() {
  const { t } = await getT();
  return (
    <main className="grain relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-bone px-5 text-center">
      <Link href="/" className="flex items-center gap-2.5 text-ink" aria-label={site.name}>
        <Mark className="h-9 w-9" tone="ink" />
        <span className="display text-[1.1rem]">Les 2 Palmiers</span>
      </Link>

      <p className="tnum display mt-14 text-[5rem] leading-none text-forest-2 sm:text-[7rem]">404</p>
      <h1 className="display mt-4 text-[1.7rem] text-ink sm:text-[2.1rem]">
        {t("notFound.title")}
      </h1>
      <p className="measure mt-3 text-[15px] leading-relaxed text-ink-2">{t("notFound.body")}</p>

      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="press inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-[14px] font-medium text-bone hover:bg-forest-2"
        >
          <Home className="h-4 w-4" /> {t("notFound.home")}
        </Link>
        <Link
          href="/appartements"
          className="press inline-flex h-12 items-center gap-2 rounded-full border border-line px-6 text-[14px] font-medium text-ink hover:border-ink/30"
        >
          <ArrowLeft className="h-4 w-4" /> {t("notFound.apartments")}
        </Link>
      </div>

      <p className="mt-12 text-[12.5px] text-ink-3">
        {t("notFound.help")}{" "}
        <a href={`mailto:${site.email}`} className="text-forest-2 underline underline-offset-2">
          {site.email}
        </a>
      </p>
    </main>
  );
}
