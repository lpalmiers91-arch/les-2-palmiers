import type { Metadata } from "next";
import { pageMeta } from "@/lib/seo";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import { ContactForm } from "@/components/marketing/contact-form";
import { getT } from "@/lib/i18n";
import { site } from "@/lib/site";


export async function generateMetadata(): Promise<Metadata> {
  return pageMeta("/contact", {
    title: "Contact",
    description: "Une question sur l'appartement, un séjour, un service ? Écrivez-nous, l'équipe des 2 Palmiers vous répond sous 24 h.",
  });
}

export default async function ContactPage() {
  const { t } = await getT();
  const wa = site.phones[0].replace(/[^\d]/g, "");

  return (
    <div className="bg-bone">
      <div className="mx-auto max-w-5xl px-5 pb-24 pt-[120px] md:px-8 md:pt-[150px]">
        <header className="max-w-2xl">
          <span className="eyebrow text-forest-2">{t("contactPage.eyebrow")}</span>
          <h1 className="display mt-3 text-[2.4rem] leading-[1.05] text-ink md:text-[3rem]">
            {t("contactPage.title")}
          </h1>
          <p className="mt-4 text-[1.02rem] leading-relaxed text-ink-2">{t("contactPage.lede")}</p>
        </header>

        <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_1.3fr]">
          <div className="space-y-5">
            <a
              href={`mailto:${site.email}`}
              className="flex items-start gap-3 rounded-[14px] border border-line bg-bone p-4 transition-colors hover:border-ink/25"
            >
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-forest-2" />
              <span>
                <span className="block text-[13px] text-ink-3">{t("contactPage.byEmail")}</span>
                <span className="text-[14.5px] text-ink">{site.email}</span>
              </span>
            </a>
            {site.phones.map((p) => (
              <a
                key={p}
                href={`tel:${p.replace(/\s/g, "")}`}
                className="flex items-start gap-3 rounded-[14px] border border-line bg-bone p-4 transition-colors hover:border-ink/25"
              >
                <Phone className="mt-0.5 h-5 w-5 shrink-0 text-forest-2" />
                <span>
                  <span className="block text-[13px] text-ink-3">{t("contactPage.byPhone")}</span>
                  <span className="tnum text-[14.5px] text-ink">{p}</span>
                </span>
              </a>
            ))}
            <a
              href={`https://wa.me/${wa}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-start gap-3 rounded-[14px] border border-line bg-bone p-4 transition-colors hover:border-ink/25"
            >
              <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-forest-2" />
              <span>
                <span className="block text-[13px] text-ink-3">WhatsApp</span>
                <span className="text-[14.5px] text-ink">{t("contactPage.whatsappCta")}</span>
              </span>
            </a>
            <div className="flex items-start gap-3 rounded-[14px] border border-line bg-bone p-4">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-forest-2" />
              <span>
                <span className="block text-[13px] text-ink-3">{t("contactPage.location")}</span>
                <span className="text-[14.5px] text-ink">
                  {site.city}, {site.country}
                </span>
              </span>
            </div>
          </div>

          <ContactForm />
        </div>
      </div>
    </div>
  );
}
