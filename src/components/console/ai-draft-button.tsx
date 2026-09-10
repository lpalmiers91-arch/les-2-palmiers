"use client";

import { useState } from "react";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { FUNCTIONS_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";
import { useT } from "@/lib/i18n/provider";

type Kind = "client_reply" | "contact_reply" | "review_reply" | "service_reply";

/**
 * Bouton « Rédiger avec l'IA ». Appelle la fonction ai-draft et transmet le
 * texte proposé à `onText` (à insérer dans un champ éditable).
 */
export function AiDraftButton({
  kind,
  context,
  onText,
  hasText = false,
  size = "sm",
  className = "",
}: {
  kind: Kind;
  context: string | Record<string, unknown>;
  onText: (text: string) => void;
  hasText?: boolean;
  size?: "sm" | "xs";
  className?: string;
}) {
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [demo, setDemo] = useState(false);

  async function run() {
    setBusy(true);
    setErr(null);
    try {
      const {
        data: { session },
      } = await createClient().auth.getSession();
      const res = await fetch(`${FUNCTIONS_URL}/ai-draft`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ kind, context }),
      });
      const j = await res.json();
      if (!res.ok || !j.text) {
        setErr(t("aiDraft.error"));
        return;
      }
      setDemo(Boolean(j.demo));
      onText(j.text as string);
    } catch {
      setErr(t("aiDraft.error"));
    } finally {
      setBusy(false);
    }
  }

  const pad = size === "xs" ? "h-7 px-2.5 text-[11.5px]" : "h-8 px-3 text-[12px]";

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className={`press inline-flex items-center gap-1.5 rounded-full border border-forest/30 bg-forest/[0.05] font-medium text-forest-2 transition-colors hover:border-forest/50 disabled:opacity-50 ${pad}`}
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : hasText ? (
          <RefreshCw className="h-3.5 w-3.5" />
        ) : (
          <Sparkles className="h-3.5 w-3.5" />
        )}
        {busy ? t("aiDraft.writing") : hasText ? t("aiDraft.redo") : t("aiDraft.draft")}
      </button>
      {err && <span className="text-[11.5px] text-danger">{err}</span>}
      {demo && !err && (
        <span className="text-[11px] text-ink-3">{t("aiDraft.demoNote")}</span>
      )}
    </span>
  );
}
