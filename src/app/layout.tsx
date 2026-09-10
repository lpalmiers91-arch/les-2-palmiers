import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/site";
import { getLocale, getT } from "@/lib/i18n";
import { localeDir } from "@/lib/i18n/languages";
import { getBranding } from "@/lib/cms";
import { Analytics } from "@/components/analytics";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const b = await getBranding();
  return {
    ...metadata,
    ...(b.favicon_url ? { icons: { icon: b.favicon_url, apple: b.favicon_url } } : {}),
  };
}

const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: "Les 2 Palmiers — Appartement de rêve & conciergerie · Cotonou",
    template: "%s · Les 2 Palmiers",
  },
  description:
    "Un appartement meublé d'exception à Cotonou et une conciergerie qui prend en charge le reste — voiture, ménage, cuisinier, bien-être, tourisme. Réservez, commandez, profitez.",
  applicationName: site.name,
  authors: [{ name: site.legalName }],
  keywords: [
    "appartement meublé Cotonou",
    "location courte durée Bénin",
    "conciergerie Cotonou",
    "services à domicile Bénin",
  ],
  openGraph: {
    type: "website",
    locale: "fr_BJ",
    url: site.url,
    siteName: site.name,
    title: "Les 2 Palmiers — Appartement de rêve & conciergerie",
    description:
      "Profitez pleinement de votre temps. Nous nous occupons du reste. Cotonou, Bénin.",
  },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#14315b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const b = await getBranding();
  const { t } = await getT();

  const overrides: string[] = [];
  if (b.accent) overrides.push(`--brass:${b.accent};--brass-2:${b.accent};`);
  if (b.font_display)
    overrides.push(`--font-display:"${b.font_display}",Georgia,serif;`);

  return (
    <html
      lang={locale}
      dir={localeDir(locale)}
      className={`${bricolage.variable} ${hanken.variable}`}
    >
      <head>
        {b.font_display && (
          <link
            rel="stylesheet"
            href={`https://fonts.googleapis.com/css2?family=${encodeURIComponent(
              b.font_display,
            )}:wght@400;500;600&display=swap`}
          />
        )}
        {overrides.length > 0 && (
          <style dangerouslySetInnerHTML={{ __html: `:root{${overrides.join("")}}` }} />
        )}
      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only left-4 top-4 z-[200] rounded-full bg-ink px-4 py-2 text-[13px] font-medium text-bone focus:not-sr-only focus:fixed"
        >
          {t("a11y.skipToContent")}
        </a>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
