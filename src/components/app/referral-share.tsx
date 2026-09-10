"use client";

import { useState } from "react";
import { Copy, Check, Share2 } from "lucide-react";
import { site } from "@/lib/site";
import { useT } from "@/lib/i18n/provider";

export function ReferralShare({ code }: { code: string }) {
  const { t } = useT();
  const [copied, setCopied] = useState<"code" | "link" | null>(null);
  const link = `${site.url}/inscription?ref=${code}`;

  async function copy(what: "code" | "link") {
    try {
      await navigator.clipboard.writeText(what === "code" ? code : link);
      setCopied(what);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      /* clipboard indisponible */
    }
  }

  async function share() {
    if (navigator.share) {
      try {
        await navigator.share({ title: site.name, text: t("referral.shareText", { code }), url: link });
      } catch {
        /* annulé */
      }
    } else {
      copy("link");
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <code className="flex-1 rounded-[10px] bg-forest px-4 py-3 text-center text-[18px] font-semibold tracking-[0.12em] text-bone">
          {code}
        </code>
        <button
          onClick={() => copy("code")}
          className="press inline-flex h-11 w-11 items-center justify-center rounded-[10px] border border-line text-ink-2 hover:border-ink/25"
          aria-label={t("referral.copyCode")}
        >
          {copied === "code" ? <Check className="h-4 w-4 text-green-2" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-[10px] bg-bone-2 px-3 py-2.5 text-[12.5px] text-ink-2">
          {link}
        </code>
        <button
          onClick={() => copy("link")}
          className="press inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-line px-3 text-[12.5px] font-medium text-ink-2 hover:border-ink/25"
        >
          {copied === "link" ? <Check className="h-3.5 w-3.5 text-green-2" /> : <Copy className="h-3.5 w-3.5" />}
          {copied === "link" ? t("referral.copied") : t("referral.copyLink")}
        </button>
      </div>

      <button
        onClick={share}
        className="press inline-flex h-11 items-center gap-2 rounded-full bg-ink px-5 text-[13px] font-medium text-bone hover:bg-forest-2"
      >
        <Share2 className="h-4 w-4" /> {t("referral.share")}
      </button>
    </div>
  );
}
