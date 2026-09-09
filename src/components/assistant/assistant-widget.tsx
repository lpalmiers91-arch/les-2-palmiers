"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { MessageCircle, X, ArrowUp, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { easeOut } from "@/lib/motion";

import { FUNCTIONS_URL as FN, SUPABASE_ANON_KEY as ANON } from "@/lib/supabase/config";

type Turn = {
  role: "user" | "assistant";
  text: string;
  actions?: { type: string; payload: Record<string, unknown> }[];
};

export function AssistantWidget({ space = "public" }: { space?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [turns, streaming]);

  async function send(text: string) {
    if (!text.trim() || streaming) return;
    setInput("");
    setTurns((t) => [...t, { role: "user", text }, { role: "assistant", text: "" }]);
    setStreaming(true);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token ?? ANON;

      const res = await fetch(`${FN}/ai-assistant`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: ANON,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: text, threadId, space }),
      });

      if (!res.ok || !res.body) throw new Error(`http ${res.status}`);
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buf = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += value;
        const parts = buf.split("\n\n");
        buf = parts.pop() ?? "";
        for (const part of parts) {
          const line = part.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          let ev: Record<string, unknown>;
          try {
            ev = JSON.parse(line.slice(5).trim());
          } catch {
            continue;
          }
          if (ev.type === "text") {
            setTurns((t) => {
              const copy = [...t];
              copy[copy.length - 1] = {
                ...copy[copy.length - 1],
                text: copy[copy.length - 1].text + (ev.text as string),
              };
              return copy;
            });
          } else if (ev.type === "action") {
            setTurns((t) => {
              const copy = [...t];
              const last = copy[copy.length - 1];
              const act = ev.action as { type: string; payload: Record<string, unknown> };
              copy[copy.length - 1] = { ...last, actions: [...(last.actions ?? []), act] };
              return copy;
            });
          } else if (ev.type === "done") {
            if (ev.threadId) setThreadId(ev.threadId as string);
          } else if (ev.type === "error") {
            setTurns((t) => {
              const copy = [...t];
              copy[copy.length - 1] = {
                ...copy[copy.length - 1],
                text: "Désolé, l'assistant est momentanément indisponible. Écrivez à l'équipe et nous reviendrons vers vous.",
              };
              return copy;
            });
          }
        }
      }
    } catch {
      setTurns((t) => {
        const copy = [...t];
        copy[copy.length - 1] = { ...copy[copy.length - 1], text: "Connexion interrompue. Réessayez." };
        return copy;
      });
    } finally {
      setStreaming(false);
    }
  }

  function runAction(a: { type: string; payload: Record<string, unknown> }) {
    if (a.type === "prefill_reservation") {
      const p = a.payload as { start?: string; end?: string; guests?: number };
      router.push(`/reserver?start=${p.start ?? ""}&end=${p.end ?? ""}&guests=${p.guests ?? 2}`);
      setOpen(false);
    } else if (a.type === "draft_service_order") {
      const p = a.payload as { service_slug?: string };
      router.push(`/app/services/${p.service_slug ?? ""}`);
      setOpen(false);
    } else if (a.type === "draft_message") {
      router.push("/app/messages");
      setOpen(false);
    }
  }

  const suggestions =
    space === "public"
      ? ["À quelle heure est l'arrivée ?", "Quels services proposez-vous ?", "C'est disponible en décembre ?"]
      : ["Résume ma prochaine réservation", "Je veux un cuisinier vendredi soir", "Quel est le code wifi ?"];

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fermer l'assistant" : "Ouvrir l'assistant"}
        className="press fixed bottom-4 right-4 z-[70] flex h-[52px] w-[52px] items-center justify-center rounded-full bg-forest text-bone shadow-[0_14px_36px_-10px_rgba(20,30,24,0.6)] sm:bottom-5 sm:right-5"
      >
        {open ? <X className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" strokeWidth={1.8} />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.28, ease: easeOut }}
            style={{ transformOrigin: "bottom right" }}
            className="fixed inset-x-3 bottom-[76px] z-[70] flex max-h-[70dvh] flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-bone shadow-[0_28px_70px_-20px_rgba(20,30,24,0.5)] sm:inset-x-auto sm:right-5 sm:w-[380px]"
          >
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-forest text-bone">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <div>
                <p className="text-[13.5px] font-medium text-ink">Assistant Les 2 Palmiers</p>
                <p className="text-[11px] text-ink-3">Réponses automatiques — un conseiller reste disponible</p>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {turns.length === 0 && (
                <div className="space-y-2">
                  <p className="text-[13.5px] text-ink-2">
                    Bonjour ! Je peux vous renseigner sur l'appartement, les services et la réservation.
                  </p>
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="press block w-full rounded-[10px] border border-line bg-bone px-3 py-2 text-left text-[13px] text-ink-2 hover:border-ink/25"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {turns.map((t, i) => (
                <div key={i} className={`flex ${t.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-[13px] px-3 py-2 text-[13.5px] leading-snug ${
                      t.role === "user" ? "bg-forest text-bone" : "bg-bone-2 text-ink"
                    }`}
                  >
                    {t.text || (streaming && i === turns.length - 1 ? "…" : "")}
                    {t.actions?.map((a, j) => (
                      <button
                        key={j}
                        onClick={() => runAction(a)}
                        className="press mt-2 block w-full rounded-full bg-ink px-3 py-1.5 text-[12px] font-medium text-bone hover:bg-forest-2"
                      >
                        {a.type === "prefill_reservation"
                          ? "Réserver ces dates"
                          : a.type === "draft_service_order"
                            ? "Préparer la commande"
                            : "Ouvrir la messagerie"}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2 border-t border-line p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Votre question…"
                className="field h-10 flex-1 text-[13.5px]"
              />
              <button
                type="submit"
                disabled={streaming || !input.trim()}
                aria-label="Envoyer"
                className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest text-bone disabled:opacity-40"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
