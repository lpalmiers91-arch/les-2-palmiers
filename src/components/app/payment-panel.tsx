"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatXOF } from "@/lib/format";

type Method = "mtn" | "moov" | "celtis" | "card";
const methods: { id: Method; label: string }[] = [
  { id: "mtn", label: "MTN MoMo" },
  { id: "moov", label: "Moov Money" },
  { id: "celtis", label: "Celtis Cash" },
  { id: "card", label: "Carte bancaire" },
];

type Step = "choose" | "screen" | "result";

export function PaymentPanel({
  purpose,
  targetId,
  amountDue,
  label = "Régler votre séjour",
}: {
  purpose: "reservation" | "service_order";
  targetId: string;
  amountDue: number;
  label?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("choose");
  const [method, setMethod] = useState<Method>("mtn");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<"success" | "failure" | "pending" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("payment_init", {
        p_purpose: purpose,
        p_target: targetId,
        p_method: method,
      });
      if (error) throw error;
      setPaymentId((data as { id: string }).id);
      setStep("screen");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  async function resolve(choice: "success" | "failure" | "pending") {
    if (!paymentId) return;
    setBusy(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.rpc("payment_resolve", {
        p_payment: paymentId,
        p_outcome: choice,
      });
      if (error) throw error;
      setOutcome(choice);
      setStep("result");
      if (choice === "success") setTimeout(() => router.refresh(), 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="display text-[1.15rem] text-ink">{label}</h2>
        <span className="tnum text-[14px] font-medium text-ink">{formatXOF(amountDue)}</span>
      </div>

      {step === "choose" && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {methods.map((m) => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={`press rounded-[11px] border px-3 py-3 text-left text-[13.5px] transition-colors ${
                  method === m.id ? "border-forest bg-forest/[0.04] text-ink" : "border-line bg-bone text-ink-2 hover:border-ink/25"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
          <button
            onClick={start}
            disabled={busy}
            className="press mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-[14px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Continuer vers le paiement
          </button>
        </>
      )}

      {step === "screen" && (
        <div className="mt-4">
          <div className="rounded-[12px] border border-dashed border-brass/40 bg-brass/[0.05] p-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brass">
              Démonstration — paiement simulé
            </p>
            <p className="mt-2 text-[13.5px] text-ink-2">
              Un vrai paiement {methods.find((m) => m.id === method)?.label} afficherait
              ici une demande de confirmation sur votre téléphone. Choisissez l'issue
              à simuler :
            </p>
          </div>
          <div className="mt-4 grid gap-2.5">
            <button onClick={() => resolve("success")} disabled={busy} className="press flex h-11 items-center justify-center gap-2 rounded-full bg-forest text-[13.5px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50">
              <Check className="h-4 w-4" /> Confirmer le paiement
            </button>
            <div className="grid grid-cols-2 gap-2.5">
              <button onClick={() => resolve("failure")} disabled={busy} className="press flex h-10 items-center justify-center gap-1.5 rounded-full border border-line text-[13px] text-ink-2 hover:border-danger/40 disabled:opacity-50">
                <X className="h-3.5 w-3.5" /> Échec
              </button>
              <button onClick={() => resolve("pending")} disabled={busy} className="press flex h-10 items-center justify-center gap-1.5 rounded-full border border-line text-[13px] text-ink-2 hover:border-ink/30 disabled:opacity-50">
                <Clock className="h-3.5 w-3.5" /> En attente
              </button>
            </div>
          </div>
        </div>
      )}

      {step === "result" && (
        <div className="mt-4 text-center">
          {outcome === "success" && (
            <>
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-forest text-bone">
                <Check className="h-6 w-6" />
              </span>
              <p className="mt-3 text-[15px] font-medium text-ink">Paiement confirmé</p>
              <p className="mt-1 text-[13px] text-ink-3">Votre réservation est confirmée. Un reçu vous est envoyé.</p>
            </>
          )}
          {outcome === "failure" && (
            <>
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger/15 text-danger">
                <X className="h-6 w-6" />
              </span>
              <p className="mt-3 text-[15px] font-medium text-ink">Paiement échoué</p>
              <button onClick={() => { setStep("choose"); setOutcome(null); }} className="press mt-3 h-10 rounded-full border border-line px-5 text-[13px]">
                Réessayer
              </button>
            </>
          )}
          {outcome === "pending" && (
            <>
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warn/15 text-warn">
                <Clock className="h-6 w-6" />
              </span>
              <p className="mt-3 text-[15px] font-medium text-ink">Paiement en attente</p>
              <p className="mt-1 text-[13px] text-ink-3">Votre réservation reste réservée le temps de la confirmation.</p>
              <button onClick={() => { setStep("choose"); setOutcome(null); }} className="press mt-3 h-10 rounded-full border border-line px-5 text-[13px]">
                Reprendre le paiement
              </button>
            </>
          )}
        </div>
      )}

      {error && <p className="mt-3 text-[12.5px] text-danger">{error}</p>}
    </div>
  );
}
