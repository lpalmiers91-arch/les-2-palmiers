"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Loader2, X, Clock, Download, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatXOF } from "@/lib/format";

type Method = "mtn" | "moov" | "celtis" | "card";
const methods: { id: Method; label: string }[] = [
  { id: "mtn", label: "MTN MoMo" },
  { id: "moov", label: "Moov Money" },
  { id: "celtis", label: "Celtis Cash" },
  { id: "card", label: "Carte / virement" },
];

type Step = "choose" | "screen" | "result";

export function PaymentPanel({
  purpose,
  targetId,
  amountDue,
  label = "Régler votre séjour",
}: {
  purpose: "reservation" | "service_order" | "balance";
  targetId: string;
  amountDue: number;
  label?: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"online" | "proof">("online");

  // --- paiement en ligne (simulé) ---
  const [step, setStep] = useState<Step>("choose");
  const [method, setMethod] = useState<Method>("mtn");
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [paymentRef, setPaymentRef] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<"success" | "failure" | "pending" | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- preuve de paiement ---
  const [proofAmount, setProofAmount] = useState(String(amountDue));
  const [proofMethod, setProofMethod] = useState<Method>("mtn");
  const [proofNote, setProofNote] = useState("");
  const [proofPath, setProofPath] = useState<string | null>(null);
  const [proofName, setProofName] = useState<string | null>(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [proofDone, setProofDone] = useState(false);
  const proofRef = useRef<HTMLInputElement>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("payment_init", {
        p_purpose: purpose === "balance" ? "reservation" : purpose,
        p_target: targetId,
        p_method: method,
      });
      if (error) throw error;
      const row = data as { id: string; internal_ref: string };
      setPaymentId(row.id);
      setPaymentRef(row.internal_ref);
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
      const { error } = await createClient().rpc("payment_resolve", {
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

  async function onProofFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    setProofUploading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${user!.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("payment-proofs")
        .upload(path, file, { contentType: file.type });
      if (error) throw error;
      setProofPath(path);
      setProofName(file.name);
    } catch {
      setError("Le téléversement a échoué.");
    } finally {
      setProofUploading(false);
    }
  }

  async function submitProof() {
    setError(null);
    const amount = Number(proofAmount);
    if (!amount || amount <= 0) return setError("Montant invalide.");
    if (!proofPath) return setError("Ajoutez une capture ou un reçu.");
    setBusy(true);
    try {
      const { error } = await createClient().rpc("payment_submit_proof", {
        p_purpose: purpose,
        p_target: targetId,
        p_method: proofMethod,
        p_amount: amount,
        p_proof_path: proofPath,
        p_note: proofNote || undefined,
      });
      if (error) throw error;
      setProofDone(true);
      router.refresh();
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

      {!proofDone && step === "choose" && (
        <div className="mt-4 flex gap-1.5 rounded-full bg-bone-2 p-1 text-[12.5px] font-medium">
          <button
            onClick={() => setMode("online")}
            className={`press flex-1 rounded-full py-2 ${mode === "online" ? "bg-bone text-ink shadow-sm" : "text-ink-3"}`}
          >
            Payer en ligne
          </button>
          <button
            onClick={() => setMode("proof")}
            className={`press flex-1 rounded-full py-2 ${mode === "proof" ? "bg-bone text-ink shadow-sm" : "text-ink-3"}`}
          >
            J&apos;ai déjà payé
          </button>
        </div>
      )}

      {/* ---------- PREUVE DE PAIEMENT ---------- */}
      {mode === "proof" && (
        <div className="mt-4">
          {proofDone ? (
            <div className="text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-warn/15 text-warn">
                <Clock className="h-6 w-6" />
              </span>
              <p className="mt-3 text-[15px] font-medium text-ink">Preuve envoyée</p>
              <p className="mt-1 text-[13px] text-ink-3">
                L&apos;équipe vérifie votre paiement et confirme sous peu. Vous recevrez une
                notification.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="rounded-[10px] bg-bone-2 px-3 py-2 text-[12.5px] text-ink-3">
                Réglez par Mobile Money ou virement, puis joignez la capture de confirmation.
                L&apos;équipe valide manuellement.
              </p>
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Montant payé (XOF)</span>
                <input
                  type="number"
                  className="field tnum"
                  value={proofAmount}
                  onChange={(e) => setProofAmount(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Moyen utilisé</span>
                <select
                  className="field"
                  value={proofMethod}
                  onChange={(e) => setProofMethod(e.target.value as Method)}
                >
                  {methods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>
              <div>
                <span className="mb-1.5 block text-[13px] font-medium text-ink-2">
                  Capture / reçu
                </span>
                <button
                  type="button"
                  onClick={() => proofRef.current?.click()}
                  disabled={proofUploading}
                  className="press flex h-11 w-full items-center justify-center gap-2 rounded-[11px] border border-dashed border-line text-[13px] text-ink-2 hover:border-ink/30 disabled:opacity-50"
                >
                  {proofUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : proofName ? (
                    <>
                      <Check className="h-4 w-4 text-forest-2" /> {proofName}
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" /> Choisir un fichier
                    </>
                  )}
                </button>
                <input
                  ref={proofRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={onProofFile}
                />
              </div>
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-ink-2">
                  Note <span className="text-ink-3">(facultatif)</span>
                </span>
                <input
                  className="field"
                  value={proofNote}
                  onChange={(e) => setProofNote(e.target.value)}
                  placeholder="Réf. transaction, heure…"
                />
              </label>
              <button
                onClick={submitProof}
                disabled={busy}
                className="press flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-[14px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Envoyer la preuve
              </button>
            </div>
          )}
        </div>
      )}

      {/* ---------- PAIEMENT EN LIGNE (simulé) ---------- */}
      {mode === "online" && step === "choose" && (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            {methods.map((m) => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                className={`press rounded-[11px] border px-3 py-3 text-left text-[13.5px] transition-colors ${
                  method === m.id
                    ? "border-forest bg-forest/[0.04] text-ink"
                    : "border-line bg-bone text-ink-2 hover:border-ink/25"
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

      {mode === "online" && step === "screen" && (
        <div className="mt-4">
          <div className="rounded-[12px] border border-dashed border-brass/40 bg-brass/[0.05] p-4">
            <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-brass">
              Démonstration — paiement simulé
            </p>
            <p className="mt-2 text-[13.5px] text-ink-2">
              Un vrai paiement {methods.find((m) => m.id === method)?.label} afficherait ici une
              demande de confirmation sur votre téléphone. Choisissez l&apos;issue à simuler :
            </p>
          </div>
          <div className="mt-4 grid gap-2.5">
            <button
              onClick={() => resolve("success")}
              disabled={busy}
              className="press flex h-11 items-center justify-center gap-2 rounded-full bg-forest text-[13.5px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
            >
              <Check className="h-4 w-4" /> Confirmer le paiement
            </button>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => resolve("failure")}
                disabled={busy}
                className="press flex h-10 items-center justify-center gap-1.5 rounded-full border border-line text-[13px] text-ink-2 hover:border-danger/40 disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" /> Échec
              </button>
              <button
                onClick={() => resolve("pending")}
                disabled={busy}
                className="press flex h-10 items-center justify-center gap-1.5 rounded-full border border-line text-[13px] text-ink-2 hover:border-ink/30 disabled:opacity-50"
              >
                <Clock className="h-3.5 w-3.5" /> En attente
              </button>
            </div>
          </div>
        </div>
      )}

      {mode === "online" && step === "result" && (
        <div className="mt-4 text-center">
          {outcome === "success" && (
            <>
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-forest text-bone">
                <Check className="h-6 w-6" />
              </span>
              <p className="mt-3 text-[15px] font-medium text-ink">Paiement confirmé</p>
              <p className="mt-1 text-[13px] text-ink-3">
                Votre réservation est confirmée. Un reçu vous est envoyé.
              </p>
              {paymentRef && (
                <Link
                  href={`/recu/${encodeURIComponent(paymentRef)}`}
                  target="_blank"
                  className="press mt-4 inline-flex h-10 items-center gap-2 rounded-full border border-line px-4 text-[13px] font-medium text-ink hover:border-ink/30"
                >
                  <Download className="h-4 w-4" /> Télécharger le reçu
                </Link>
              )}
            </>
          )}
          {outcome === "failure" && (
            <>
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-danger/15 text-danger">
                <X className="h-6 w-6" />
              </span>
              <p className="mt-3 text-[15px] font-medium text-ink">Paiement échoué</p>
              <button
                onClick={() => {
                  setStep("choose");
                  setOutcome(null);
                }}
                className="press mt-3 h-10 rounded-full border border-line px-5 text-[13px]"
              >
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
              <button
                onClick={() => {
                  setStep("choose");
                  setOutcome(null);
                }}
                className="press mt-3 h-10 rounded-full border border-line px-5 text-[13px]"
              >
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
