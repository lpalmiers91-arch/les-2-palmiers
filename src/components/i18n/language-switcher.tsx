"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe, Check, ChevronDown } from "lucide-react";
import { LANGUAGES, type Locale } from "@/lib/i18n/languages";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";

export function LanguageSwitcher({
  tone = "ink",
  drop = "down",
}: {
  tone?: "ink" | "bone";
  drop?: "down" | "up";
}) {
  const router = useRouter();
  const { t, locale } = useT();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  const current = LANGUAGES.find((l) => l.code === locale) ?? LANGUAGES[0];

  function choose(code: Locale) {
    setOpen(false);
    document.cookie = `NEXT_LOCALE=${code}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
    document.documentElement.lang = code;
    document.documentElement.dir = code === "ar" ? "rtl" : "ltr";
    start(async () => {
      try {
        const supabase = createClient();
        const { data } = await supabase.auth.getUser();
        if (data.user) await supabase.from("profiles").update({ locale: code }).eq("id", data.user.id);
      } catch {
        /* visiteur non connecté */
      }
      router.refresh();
    });
  }

  const text = tone === "bone" ? "text-bone/80 hover:text-bone" : "text-ink-3 hover:text-ink";

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={pending}
        aria-label={t("nav.chooseLanguage")}
        className={`press flex items-center gap-1.5 text-[13px] font-medium transition-colors ${text} disabled:opacity-50`}
      >
        <Globe className="h-4 w-4" />
        <span className="uppercase">{current.code}</span>
        <ChevronDown className="h-3.5 w-3.5" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className={`absolute right-0 z-50 w-44 overflow-hidden rounded-[12px] border border-line bg-bone py-1 shadow-[0_20px_50px_-18px_rgba(23,19,13,0.35)] ${
              drop === "up" ? "bottom-full mb-2" : "mt-2"
            }`}
          >
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => choose(l.code)}
                className="flex w-full items-center justify-between px-3 py-2 text-left text-[13px] text-ink-2 hover:bg-ink/5"
              >
                <span>{l.label}</span>
                {l.code === locale && <Check className="h-3.5 w-3.5 text-forest-2" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
