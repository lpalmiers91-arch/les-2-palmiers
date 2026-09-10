"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { Mark } from "@/components/brand/mark";
import { ButtonLink } from "@/components/ui/button";
import { easeOut } from "@/lib/motion";
import { useT } from "@/lib/i18n/provider";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";

export function SiteHeader({
  wordmark,
  logoUrl,
  navExtra = [],
}: {
  wordmark?: string;
  logoUrl?: string;
  navExtra?: { href: string; label: string }[];
} = {}) {
  const { t } = useT();
  const pathname = usePathname();
  const brand = wordmark?.trim() || "Les 2 Palmiers";
  const onHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  const links = [
    { href: "/appartements", label: t("nav.apartments") },
    { href: "/services", label: t("nav.services") },
    { href: "/le-lieu", label: t("nav.place") },
    { href: "/contact", label: t("nav.contact") },
    ...navExtra,
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.style.overflow = open ? "hidden" : "";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  const solid = scrolled || open || !onHome;
  const dark = !solid; // texte clair au-dessus du hero vert, sombre ailleurs

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div
        className={`transition-colors duration-500 ${
          solid
            ? "border-b border-ink/10 bg-bone/85 backdrop-blur-xl"
            : "border-b border-transparent"
        }`}
      >
        <div className="mx-auto flex h-[68px] max-w-6xl items-center justify-between px-5 md:px-8">
          <Link
            href="/"
            className={`flex items-center gap-2.5 transition-colors ${dark ? "text-bone" : "text-ink"}`}
            aria-label="Les 2 Palmiers, accueil"
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={brand} className="h-7 w-auto" />
            ) : (
              <Mark className="h-7 w-7" tone={dark ? "bone" : "ink"} />
            )}
            <span className="display text-[1.06rem] leading-none">{brand}</span>
          </Link>

          <nav
            className={`hidden items-center gap-8 text-[13.5px] font-medium md:flex ${
              dark ? "text-bone/80" : "text-ink-2"
            }`}
          >
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`relative py-1 transition-colors after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:scale-x-0 after:bg-brass-2 after:transition-transform after:duration-300 hover:after:scale-x-100 ${
                  dark ? "hover:text-bone" : "hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-3 md:flex">
            <LanguageSwitcher tone={dark ? "bone" : "ink"} />
            <Link
              href="/connexion"
              className={`text-[13px] font-medium transition-colors ${
                dark ? "text-bone/75 hover:text-bone" : "text-ink-3 hover:text-ink"
              }`}
            >
              {t("nav.clientArea")}
            </Link>
            <ButtonLink
              href="/reserver" data-track="reserver-header"
              size="sm"
              variant={dark ? "brass" : "solid"}
              className="!h-10 !px-5"
            >
              {t("nav.book")}
            </ButtonLink>
          </div>

          <button
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            aria-expanded={open}
            className={`press -mr-2 flex h-10 w-10 items-center justify-center md:hidden ${
              dark ? "text-bone" : "text-ink"
            }`}
          >
            {open ? <X className="h-[22px] w-[22px]" /> : <Menu className="h-[22px] w-[22px]" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.28, ease: easeOut }}
            className="overflow-hidden border-b border-ink/10 bg-bone md:hidden"
          >
            <nav className="mx-auto flex max-w-6xl flex-col px-5 py-4">
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="border-b border-line-soft py-3.5 text-[17px] font-medium text-ink"
                >
                  {l.label}
                </Link>
              ))}
              <div className="mt-4 flex items-center justify-between border-b border-line-soft py-3.5">
                <span className="text-[15px] text-ink-3">Langue</span>
                <LanguageSwitcher />
              </div>
              <div className="mt-5 flex items-center gap-3">
                <ButtonLink href="/reserver" data-track="reserver-header" className="flex-1" onClick={() => setOpen(false)}>
                  {t("nav.book")}
                </ButtonLink>
                <ButtonLink
                  href="/connexion"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setOpen(false)}
                >
                  {t("nav.clientArea")}
                </ButtonLink>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
