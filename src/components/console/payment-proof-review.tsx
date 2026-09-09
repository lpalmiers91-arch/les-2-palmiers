"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, X, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatXOF, formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n/provider";

export type ProofRow = {
  id: string;
  internal_ref: string;
  amount: number;
  method: string;
  purpose: string;
  proof_path: string | null;
  proof_note: string | null;
  created_at: string;
  payer_name: string | null;
  reservation_ref: string | null;
};

const METHOD: Record<string, string> = {
  mtn: "MTN MoMo",
  moov: "Moov Money",
  celtis: "Celtis Cash",
  card: "Carte / virement",
};

export function PaymentProofReview({ rows }: { rows: ProofRow[] }) {
  const { t } = useT();
  if (rows.length === 0) {
    return (
      <p className="rounded-[var(--radius-lg)] border border-dashed border-line bg-bone/60 px-5 py-8 text-center text-[13px] text-ink-3">
        {t("console.proof.none")}
      </p>
    );
  }
  return (
    <div className="space-y-4">
      {rows.map((r) => (
        <ProofCard key={r.id} row={r} />
      ))}
    </div>
  );
}

function ProofCard({ row }: { row: ProofRow }) {
  const router = useRouter();
  const { t } = useT();
  const [url, setUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!row.proof_path) return;
    createClient()
      .storage.from("payment-proofs")
      .createSignedUrl(row.proof_path, 600)
      .then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [row.proof_path]);

  async function decide(decision: "approve" | "reject") {
    setErr(null);
    if (decision === "reject" && note.trim().length < 3) {
      setErr(t("console.proof.needReason"));
      return;
    }
    setBusy(decision);
    try {
      const { error } = await createClient().rpc("payment_review_proof", {
        p_payment: row.id,
        p_decision: decision,
        p_note: decision === "reject" ? note.trim() : undefined,
      });
      if (error) throw error;
      router.refresh();
    } catch {
      setErr(t("console.proof.actionFailed"));
      setBusy(null);
    }
  }

  const isPdf = row.proof_path?.toLowerCase().endsWith(".pdf");

  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-medium text-ink">
            {row.payer_name ?? t("console.staffHome.client")}
          </p>
          <p className="text-[12.5px] text-ink-3">
            {formatXOF(Number(row.amount))} · {METHOD[row.method] ?? row.method} ·{" "}
            {row.purpose === "service_order" ? t("console.proof.service") : t("console.proof.stay")}
            {row.reservation_ref ? ` · ${t("console.demandeCard.ref")} ${row.reservation_ref}` : ""}
          </p>
          {row.proof_note && <p className="mt-1 text-[12.5px] text-ink-2">« {row.proof_note} »</p>}
        </div>
        <p className="text-[12px] text-ink-3">{formatDate(row.created_at)}</p>
      </div>

      <a
        href={url || undefined}
        target="_blank"
        rel="noreferrer"
        className="mt-3 block overflow-hidden rounded-[10px] border border-line-soft bg-bone-2"
      >
        <div className="flex aspect-[3/2] items-center justify-center">
          {!url ? (
            <Loader2 className="h-4 w-4 animate-spin text-ink-3" />
          ) : isPdf ? (
            <FileText className="h-7 w-7 text-ink-3" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="Preuve" className="h-full w-full object-contain" />
          )}
        </div>
      </a>

      {err && <p className="mt-2 text-[13px] text-danger">{err}</p>}

      {rejecting ? (
        <div className="mt-3">
          <input
            className="field"
            placeholder={t("console.verif.reasonPlaceholder")}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => decide("reject")}
              disabled={busy !== null}
              className="press flex h-9 items-center gap-1.5 rounded-full bg-danger px-4 text-[12.5px] font-medium text-bone disabled:opacity-50"
            >
              {busy === "reject" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
              {t("console.verif.confirmReject")}
            </button>
            <button onClick={() => setRejecting(false)} className="press h-9 px-3 text-[12.5px] text-ink-3">
              {t("console.action.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => decide("approve")}
            disabled={busy !== null}
            className="press flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[12.5px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
          >
            {busy === "approve" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            {t("console.proof.approve")}
          </button>
          <button
            onClick={() => setRejecting(true)}
            className="press flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-[12.5px] font-medium text-ink hover:border-danger/40 hover:text-danger"
          >
            <X className="h-3.5 w-3.5" /> {t("console.verif.reject")}
          </button>
        </div>
      )}
    </div>
  );
}
