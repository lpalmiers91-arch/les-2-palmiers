"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { RotateCcw, Home } from "lucide-react";
import { Mark } from "@/components/brand/mark";

// error.tsx est rendu hors de tout layout applicatif (donc hors I18nProvider).
// Un mini-dictionnaire autonome, lu depuis le cookie NEXT_LOCALE.
const DICT: Record<string, Record<string, string>> = {
  fr: { title: "Une erreur est survenue", body: "Quelque chose s'est mal passé de notre côté. Réessayez dans un instant.", ref: "Référence", retry: "Réessayer", home: "Accueil" },
  en: { title: "Something went wrong", body: "An error occurred on our side. Please try again in a moment.", ref: "Reference", retry: "Try again", home: "Home" },
  es: { title: "Se ha producido un error", body: "Algo salió mal de nuestro lado. Inténtelo de nuevo en un momento.", ref: "Referencia", retry: "Reintentar", home: "Inicio" },
  zh: { title: "出现了错误", body: "我们这边出现了问题。请稍后重试。", ref: "参考编号", retry: "重试", home: "首页" },
  ar: { title: "حدث خطأ", body: "حدث خطأ من جانبنا. يرجى المحاولة مرة أخرى بعد قليل.", ref: "المرجع", retry: "إعادة المحاولة", home: "الرئيسية" },
  pt: { title: "Ocorreu um erro", body: "Algo correu mal do nosso lado. Tente novamente daqui a pouco.", ref: "Referência", retry: "Tentar de novo", home: "Início" },
  de: { title: "Ein Fehler ist aufgetreten", body: "Auf unserer Seite ist etwas schiefgelaufen. Bitte versuchen Sie es gleich noch einmal.", ref: "Referenz", retry: "Erneut versuchen", home: "Startseite" },
  it: { title: "Si è verificato un errore", body: "Qualcosa è andato storto dalla nostra parte. Riprova tra un momento.", ref: "Riferimento", retry: "Riprova", home: "Home" },
  ru: { title: "Произошла ошибка", body: "На нашей стороне что-то пошло не так. Повторите попытку через мгновение.", ref: "Номер", retry: "Повторить", home: "Главная" },
  ja: { title: "エラーが発生しました", body: "こちら側で問題が発生しました。しばらくしてからもう一度お試しください。", ref: "参照番号", retry: "再試行", home: "ホーム" },
};

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [loc, setLoc] = useState("fr");

  useEffect(() => {
    console.error("app error boundary:", error);
    const m = document.cookie.match(/(?:^|;\s*)NEXT_LOCALE=([a-z]{2})/);
    if (m && DICT[m[1]]) setLoc(m[1]);
  }, [error]);

  const tt = DICT[loc] ?? DICT.fr;

  return (
    <main className="grain relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-bone px-5 text-center">
      <Link href="/" className="flex items-center gap-2.5 text-ink" aria-label="Les 2 Palmiers">
        <Mark className="h-9 w-9" tone="ink" />
        <span className="display text-[1.1rem]">Les 2 Palmiers</span>
      </Link>

      <h1 className="display mt-14 text-[1.8rem] text-ink sm:text-[2.2rem]">{tt.title}</h1>
      <p className="measure mt-3 text-[15px] leading-relaxed text-ink-2">{tt.body}</p>
      {error.digest && (
        <p className="tnum mt-2 text-[12px] text-ink-3">
          {tt.ref} {error.digest}
        </p>
      )}

      <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={reset}
          className="press inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-[14px] font-medium text-bone hover:bg-forest-2"
        >
          <RotateCcw className="h-4 w-4" /> {tt.retry}
        </button>
        <Link
          href="/"
          className="press inline-flex h-12 items-center gap-2 rounded-full border border-line px-6 text-[14px] font-medium text-ink hover:border-ink/30"
        >
          <Home className="h-4 w-4" /> {tt.home}
        </Link>
      </div>
    </main>
  );
}
