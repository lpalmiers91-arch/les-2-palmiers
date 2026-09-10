import Link from "next/link";
import { site } from "@/lib/site";
import { servicesFallback, destinationsFallback } from "@/lib/site";
import { getT } from "@/lib/i18n";
import { getBranding } from "@/lib/cms";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";

export async function SiteFooter() {
  const { t } = await getT();
  const branding = await getBranding();
  const brand = branding.wordmark?.trim() || "Les 2 Palmiers";
  const year = new Date().getFullYear();

  const cols = [
    {
      title: t("footer.colStay"),
      links: [
        { href: "/#appartement", label: t("nav.apartment") },
        { href: "/reserver", label: t("nav.book") },
        { href: "/le-lieu", label: t("nav.place") },
        { href: "/contact", label: t("nav.contact") },
        { href: "/connexion", label: t("nav.clientArea") },
      ],
    },
    {
      title: t("footer.colServices"),
      links: servicesFallback.slice(0, 6).map((s) => ({ href: "/#services", label: s.title })),
    },
    {
      title: t("footer.colAround"),
      links: destinationsFallback.map((d) => ({ href: "/#le-lieu", label: d.name })),
    },
  ];

  return (
    <footer className="on-dark grain relative overflow-hidden bg-ink text-bone">
      <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <div className="grid gap-12 text-center md:grid-cols-[1.4fr_1fr_1fr_1fr] md:text-left">
          <div>
            <Link
              href="/"
              className="flex items-center justify-center gap-2.5 md:justify-start"
              aria-label="Les 2 Palmiers"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={branding.logo_url || "/brand/wordmark-light.png"}
                alt={brand}
                className="h-9 w-auto"
              />
            </Link>
            <p className="mx-auto mt-5 max-w-xs text-[14px] leading-relaxed text-bone/55 md:mx-0">
              {t("footer.tagline", { city: site.city, country: site.country })}
            </p>
            <div className="mt-6 space-y-1.5 text-[14px]">
              {site.phones.map((p) => (
                <a
                  key={p}
                  href={`tel:${p.replace(/\s/g, "")}`}
                  className="tnum block text-bone/70 transition-colors hover:text-bone"
                >
                  {p}
                </a>
              ))}
              <a
                href={`mailto:${site.email}`}
                className="block text-bone/70 transition-colors hover:text-bone"
              >
                {site.email}
              </a>
            </div>
          </div>

          {cols.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h4 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sand">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-2.5 text-[14px]">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-bone/60 transition-colors hover:text-bone">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center gap-4 border-t border-line-dark pt-7 text-center text-[12.5px] text-bone/45 sm:flex-row sm:items-center sm:justify-between sm:text-left">
          <p className="order-3 sm:order-1">© {year} {site.legalName}</p>
          <div className="order-1 text-bone/70 sm:order-2">
            <LanguageSwitcher tone="bone" drop="up" />
          </div>
          <nav
            className="order-2 flex flex-wrap justify-center gap-x-5 gap-y-1 sm:order-3"
            aria-label="Legal"
          >
            <Link href="/legal/confidentialite" className="hover:text-bone/70">
              {t("footer.privacy")}
            </Link>
            <Link href="/legal/cookies" className="hover:text-bone/70">
              {t("footer.cookies")}
            </Link>
            <Link href="/legal/cgv" className="hover:text-bone/70">
              {t("footer.terms")}
            </Link>
            <Link href="/legal/mentions" className="hover:text-bone/70">
              {t("footer.legal")}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
