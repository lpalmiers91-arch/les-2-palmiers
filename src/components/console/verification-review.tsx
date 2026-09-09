"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, X, ShieldCheck, FileText } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n/provider";

export type VerifRow = {
  id: string;
  user_id: string;
  status: "pending" | "approved" | "rejected";
  legal_full_name: string;
  date_of_birth: string | null;
  nationality: string | null;
  document_type: string;
  document_number: string;
  document_expiry: string | null;
  selfie_path: string;
  document_front_path: string;
  document_back_path: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  client_name: string | null;
  client_email: string | null;
};

const DOC_LABEL_KEY: Record<string, string> = {
  id_card: "idCard",
  passport: "passport",
  residence_permit: "residencePermit",
  drivers_license: "driversLicense",
};

export function VerificationReview({ rows }: { rows: VerifRow[] }) {
  const { t } = useT();
  const pending = rows.filter((r) => r.status === "pending");
  const history = rows.filter((r) => r.status !== "pending").slice(0, 20);

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
          {t("console.verif.toProcess")} ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="mt-3 rounded-[var(--radius-lg)] border border-dashed border-line bg-bone/60 px-5 py-8 text-center text-[13px] text-ink-3">
            {t("console.verif.noneWaiting")}
          </p>
        ) : (
          <div className="mt-3 space-y-4">
            {pending.map((r) => (
              <VerifCard key={r.id} row={r} />
            ))}
          </div>
        )}
      </section>

      {history.length > 0 && (
        <section>
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
            {t("console.verif.history")}
          </h2>
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-bone">
            {history.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-4 px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[13.5px] text-ink">
                    {r.client_name || r.legal_full_name}
                  </p>
                  <p className="text-[12px] text-ink-3">
                    {r.reviewed_at ? formatDate(r.reviewed_at) : ""}
                    {r.rejection_reason ? ` · ${r.rejection_reason}` : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-medium ${
                    r.status === "approved"
                      ? "bg-ok/12 text-forest-2"
                      : "bg-danger/12 text-danger"
                  }`}
                >
                  {r.status === "approved" ? t("console.verif.approved") : t("console.verif.rejected")}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function VerifCard({ row }: { row: VerifRow }) {
  const router = useRouter();
  const { t } = useT();
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const paths = [row.selfie_path, row.document_front_path, row.document_back_path].filter(
      Boolean,
    ) as string[];
    supabase.storage
      .from("identity-docs")
      .createSignedUrls(paths, 600)
      .then(({ data }) => {
        if (!data) return;
        const m: Record<string, string> = {};
        data.forEach((d, i) => {
          if (d.signedUrl) m[paths[i]] = d.signedUrl;
        });
        setUrls(m);
      });
  }, [row.selfie_path, row.document_front_path, row.document_back_path]);

  async function decide(decision: "approved" | "rejected") {
    setErr(null);
    if (decision === "rejected" && reason.trim().length < 4) {
      setErr(t("console.verif.needReason"));
      return;
    }
    setBusy(decision === "approved" ? "approve" : "reject");
    try {
      const { error } = await createClient().rpc("review_identity_verification", {
        p_id: row.id,
        p_decision: decision,
        p_reason: decision === "rejected" ? reason.trim() : undefined,
      });
      if (error) throw error;
      router.refresh();
    } catch {
      setErr(t("console.verif.actionFailed"));
      setBusy(null);
    }
  }

  const isPdf = (p: string) => p.toLowerCase().endsWith(".pdf");

  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-medium text-ink">{row.client_name || row.legal_full_name}</p>
          <p className="text-[12.5px] text-ink-3">{row.client_email}</p>
        </div>
        <p className="text-[12px] text-ink-3">
          {t("console.verif.submittedOn")} {formatDate(row.submitted_at)}
        </p>
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-1.5 text-[13px] sm:grid-cols-2">
        <Line label={t("console.verif.legalName")}>{row.legal_full_name}</Line>
        <Line label={t("console.verif.type")}>
          {DOC_LABEL_KEY[row.document_type]
            ? t(`console.verif.doc.${DOC_LABEL_KEY[row.document_type]}`)
            : row.document_type}
        </Line>
        <Line label={t("console.verif.docNumber")}>{row.document_number}</Line>
        <Line label={t("console.verif.birth")}>{row.date_of_birth ?? "—"}</Line>
        <Line label={t("console.verif.nationality")}>{row.nationality ?? "—"}</Line>
        <Line label={t("console.verif.expiry")}>{row.document_expiry ?? "—"}</Line>
      </dl>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Doc label={t("console.verif.selfie")} url={urls[row.selfie_path]} pdf={isPdf(row.selfie_path)} />
        <Doc label={t("console.verif.docFront")} url={urls[row.document_front_path]} pdf={isPdf(row.document_front_path)} />
        {row.document_back_path && (
          <Doc
            label={t("console.verif.docBack")}
            url={urls[row.document_back_path]}
            pdf={isPdf(row.document_back_path)}
          />
        )}
      </div>

      {err && <p className="mt-3 text-[13px] text-danger">{err}</p>}

      {rejecting ? (
        <div className="mt-4">
          <input
            className="field"
            placeholder={t("console.verif.reasonPlaceholder")}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={() => decide("rejected")}
              disabled={busy !== null}
              className="press flex h-9 items-center gap-1.5 rounded-full bg-danger px-4 text-[12.5px] font-medium text-bone disabled:opacity-50"
            >
              {busy === "reject" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
              {t("console.verif.confirmReject")}
            </button>
            <button
              onClick={() => setRejecting(false)}
              className="press h-9 rounded-full px-3 text-[12.5px] text-ink-3"
            >
              {t("console.action.cancel")}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => decide("approved")}
            disabled={busy !== null}
            className="press flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[12.5px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
          >
            {busy === "approve" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ShieldCheck className="h-3.5 w-3.5" />
            )}
            {t("console.verif.approve")}
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

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line-soft py-1">
      <dt className="text-ink-3">{label}</dt>
      <dd className="text-right text-ink">{children}</dd>
    </div>
  );
}

function Doc({ label, url, pdf }: { label: string; url?: string; pdf: boolean }) {
  return (
    <a
      href={url || undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="group block overflow-hidden rounded-[10px] border border-line-soft bg-bone-2"
    >
      <div className="relative flex aspect-[4/3] items-center justify-center">
        {!url ? (
          <Loader2 className="h-4 w-4 animate-spin text-ink-3" />
        ) : pdf ? (
          <FileText className="h-6 w-6 text-ink-3" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="h-full w-full object-cover" />
        )}
      </div>
      <p className="px-2 py-1.5 text-[11.5px] text-ink-3 group-hover:text-ink">{label}</p>
    </a>
  );
}
