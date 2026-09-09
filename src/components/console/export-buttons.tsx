"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { useT } from "@/lib/i18n/provider";

const KINDS = ["clients", "reservations", "payments", "reviews", "analytics"] as const;

export function ExportButtons() {
  const { t } = useT();
  const [busy, setBusy] = useState<string | null>(null);

  async function download(kind: string) {
    setBusy(kind);
    try {
      const res = await fetch(`/api/export/${kind}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `les2palmiers-${kind}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      /* silencieux */
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {KINDS.map((k) => (
        <button
          key={k}
          onClick={() => download(k)}
          disabled={busy !== null}
          className="press flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-[12px] font-medium text-ink-2 hover:border-ink/30 disabled:opacity-50"
        >
          {busy === k ? <Loader2 className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
          {t(`console.analytics.export.${k}`)}
        </button>
      ))}
    </div>
  );
}
