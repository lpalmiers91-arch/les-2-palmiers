"use client";

import { useState } from "react";
import { Loader2, Check } from "lucide-react";
import { useT } from "@/lib/i18n/provider";

export function ContactForm() {
  const { t, locale } = useT();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr(null);
    const fd = new FormData(e.currentTarget);
    const body = {
      name: String(fd.get("name") || ""),
      email: String(fd.get("email") || ""),
      phone: String(fd.get("phone") || ""),
      subject: String(fd.get("subject") || ""),
      message: String(fd.get("message") || ""),
      hp: String(fd.get("company") || ""),
      locale,
    };
    if (body.name.trim().length < 2 || body.message.trim().length < 10 || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email)) {
      setErr(t("contactPage.errInvalid"));
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 429) {
        setErr(t("contactPage.errRate"));
        return;
      }
      if (!res.ok) {
        setErr(t("contactPage.errGeneric"));
        return;
      }
      setDone(true);
    } catch {
      setErr(t("contactPage.errGeneric"));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-forest/25 bg-forest/[0.04] p-6">
        <p className="flex items-center gap-2 text-[15px] font-medium text-ink">
          <Check className="h-4.5 w-4.5 text-forest-2" /> {t("contactPage.sentTitle")}
        </p>
        <p className="mt-1.5 text-[13.5px] text-ink-2">{t("contactPage.sentBody")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="rounded-[var(--radius-lg)] border border-line bg-bone p-6 sm:p-7">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[13px] text-ink-2">{t("contactPage.name")}</span>
          <input name="name" required autoComplete="name" className="field" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] text-ink-2">{t("contactPage.email")}</span>
          <input name="email" type="email" required autoComplete="email" className="field" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] text-ink-2">
            {t("contactPage.phone")} <span className="text-ink-3">({t("contactPage.optional")})</span>
          </span>
          <input name="phone" type="tel" autoComplete="tel" className="field" />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] text-ink-2">
            {t("contactPage.subject")} <span className="text-ink-3">({t("contactPage.optional")})</span>
          </span>
          <input name="subject" className="field" />
        </label>
      </div>

      <label className="mt-4 block">
        <span className="mb-1.5 block text-[13px] text-ink-2">{t("contactPage.message")}</span>
        <textarea name="message" required rows={5} className="field h-auto resize-y py-3" />
      </label>

      {/* honeypot anti-bot */}
      <input
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      {err && <p className="mt-3 text-[13px] text-danger">{err}</p>}

      <button
        type="submit"
        disabled={busy}
        className="press mt-5 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-ink px-7 text-[14px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {t("contactPage.send")}
      </button>
      <p className="mt-3 text-[12px] text-ink-3">{t("contactPage.privacyNote")}</p>
    </form>
  );
}
