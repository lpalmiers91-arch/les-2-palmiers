import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk } from "next/font/google";
import "./globals.css";
import { site } from "@/lib/site";
import { getLocale } from "@/lib/i18n";
import { localeDir } from "@/lib/i18n/languages";

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

export const metadata: Metadata = {
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
  themeColor: "#1e3a2b",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      dir={localeDir(locale)}
      className={`${bricolage.variable} ${hanken.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
