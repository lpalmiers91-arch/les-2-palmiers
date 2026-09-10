import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { aptImg } from "@/lib/site";
import { I18nProvider } from "@/lib/i18n/provider";
import { getLocale, getMessages, getT } from "@/lib/i18n";

export default async function AuthLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages(locale);
  const { t } = await getT();
  return (
    <I18nProvider locale={locale} messages={messages}>
    <div className="min-h-dvh bg-bone lg:grid lg:grid-cols-[1fr_1.1fr]">
      {/* volet gauche — présentation */}
      <aside className="relative hidden overflow-hidden bg-forest text-bone lg:block">
        <Image
          src={aptImg("terrace-palms.jpg")}
          alt=""
          fill
          sizes="45vw"
          className="object-cover object-[50%_78%] opacity-40"
        />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/wordmark-light.png" alt="Les 2 Palmiers" className="h-8 w-auto" />
          </Link>
          <div>
            <p className="display max-w-sm text-[2rem] leading-[1.12]">{t("hero.titleA")} {t("hero.titleB")}</p>
            <p className="mt-3 max-w-sm text-[15px] italic text-brass-3">{t("hero.titleEm")}</p>
          </div>
        </div>
      </aside>

      {/* volet droit — formulaire */}
      <main id="main-content" className="flex min-h-dvh flex-col">
        <div className="flex items-center justify-between px-6 py-6">
          <Link href="/" className="flex items-center gap-2.5 text-ink lg:invisible">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/wordmark.png" alt="Les 2 Palmiers" className="h-7 w-auto" />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-16 pt-4 lg:pt-16">
          <div className="w-full max-w-[380px]">{children}</div>
        </div>
      </main>
    </div>
    </I18nProvider>
  );
}
