import Link from "next/link";
import { Mark } from "@/components/brand/mark";
import { site } from "@/lib/site";
import { servicesFallback, destinationsFallback } from "@/lib/site";

const cols = [
  {
    title: "Séjour",
    links: [
      { href: "/appartement", label: "L'appartement" },
      { href: "/reserver", label: "Réserver" },
      { href: "/le-lieu", label: "Le lieu" },
      { href: "/connexion", label: "Espace client" },
    ],
  },
  {
    title: "Services",
    links: servicesFallback.slice(0, 6).map((s) => ({
      href: `/services#${s.slug}`,
      label: s.title,
    })),
  },
  {
    title: "Autour",
    links: destinationsFallback.map((d) => ({
      href: "/le-lieu",
      label: d.name,
    })),
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="on-dark grain relative overflow-hidden bg-ink text-bone">
      <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Link href="/" className="flex items-center gap-2.5" aria-label="Les 2 Palmiers, accueil">
              <Mark className="h-8 w-8" tone="bone" />
              <span className="display text-[1.15rem]">Les 2 Palmiers</span>
            </Link>
            <p className="mt-5 max-w-xs text-[14px] leading-relaxed text-bone/55">
              Appartement de rêve & conciergerie. {site.city}, {site.country}.
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

        <div className="mt-14 flex flex-col gap-3 border-t border-line-dark pt-7 text-[12.5px] text-bone/45 sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} {site.legalName}</p>
          <nav className="flex flex-wrap gap-x-5 gap-y-1" aria-label="Mentions légales">
            <Link href="/legal/confidentialite" className="hover:text-bone/70">Confidentialité</Link>
            <Link href="/legal/cookies" className="hover:text-bone/70">Cookies</Link>
            <Link href="/legal/cgv" className="hover:text-bone/70">CGV</Link>
            <Link href="/legal/mentions" className="hover:text-bone/70">Mentions légales</Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
