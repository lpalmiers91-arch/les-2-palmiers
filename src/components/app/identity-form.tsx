"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Upload, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";

const DOC_TYPES = [
  { value: "id_card", label: "idForm.docIdCard" },
  { value: "passport", label: "idForm.docPassport" },
  { value: "residence_permit", label: "idForm.docResidence" },
  { value: "drivers_license", label: "idForm.docLicense" },
];

type Upload = { path: string; name: string } | null;

export function IdentityForm({
  userId,
  defaultName,
  defaultDob,
  defaultNationality,
  status,
}: {
  userId: string;
  defaultName: string;
  defaultDob: string;
  defaultNationality: string;
  status: string;
}) {
  const { t } = useT();
  const router = useRouter();
  const [name, setName] = useState(defaultName);
  const [dob, setDob] = useState(defaultDob);
  const [nat, setNat] = useState(defaultNationality);
  const [docType, setDocType] = useState("id_card");
  const [docNum, setDocNum] = useState("");
  const [docExp, setDocExp] = useState("");

  const [selfie, setSelfie] = useState<Upload>(null);
  const [front, setFront] = useState<Upload>(null);
  const [back, setBack] = useState<Upload>(null);

  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function uploadTo(kind: string, file: File): Promise<Upload> {
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${userId}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("identity-docs")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (error) throw error;
    return { path, name: file.name };
  }

  function pick(
    kind: "selfie" | "front" | "back",
    setter: (u: Upload) => void,
  ) {
    return async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        setErr(t("idForm.fileTooBig"));
        return;
      }
      setErr(null);
      setBusy(true);
      try {
        setter(await uploadTo(kind, file));
      } catch {
        setErr(t("idForm.uploadFailed"));
      } finally {
        setBusy(false);
      }
    };
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!name.trim() || !docNum.trim()) {
      setErr(t("idForm.needNameAndNum"));
      return;
    }
    if (!selfie || !front) {
      setErr(t("idForm.needDocs"));
      return;
    }
    setBusy(true);
    try {
      const { error } = await createClient().rpc("submit_identity_verification", {
        p_legal_full_name: name.trim(),
        p_date_of_birth: dob || undefined,
        p_nationality: nat || undefined,
        p_document_type: docType,
        p_document_number: docNum.trim(),
        p_document_expiry: docExp || undefined,
        p_selfie_path: selfie.path,
        p_document_front_path: front.path,
        p_document_back_path: back?.path ?? undefined,
      });
      if (error) throw error;
      setDone(true);
      router.refresh();
    } catch (e) {
      const m = e instanceof Error ? e.message : "";
      setErr(
        /already_verified/.test(m)
          ? t("idForm.alreadyVerified")
          : t("idForm.errSend"),
      );
    } finally {
      setBusy(false);
    }
  }

  if (status === "approved") {
    return (
      <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-6 text-center">
        <ShieldCheck className="mx-auto h-8 w-8 text-green-2" />
        <p className="mt-3 text-[15px] font-medium text-ink">{t("idForm.verifiedT")}</p>
        <p className="mt-1 text-[13px] text-ink-3">{t("idForm.verifiedB")}</p>
      </div>
    );
  }

  if (done || status === "pending") {
    return (
      <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-6 text-center">
        <Loader2 className="mx-auto h-7 w-7 animate-spin text-brass-2" />
        <p className="mt-3 text-[15px] font-medium text-ink">{t("idForm.receivedT")}</p>
        <p className="mt-1 text-[13px] text-ink-3">{t("idForm.receivedB")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {status === "rejected" && (
        <p className="rounded-[10px] bg-danger/10 px-3 py-2 text-[13px] text-danger">
          {t("idForm.rejectedNote")}
        </p>
      )}

      <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6">
        <h2 className="display text-[1.1rem] text-ink">{t("idForm.yourInfo")}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">
              {t("idForm.fullNameLabel")}
            </span>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{t("idForm.dob")}</span>
            <input type="date" className="field" value={dob} onChange={(e) => setDob(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{t("idForm.nationality")}</span>
            <input className="field" value={nat} onChange={(e) => setNat(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{t("idForm.docType")}</span>
            <select className="field" value={docType} onChange={(e) => setDocType(e.target.value)}>
              {DOC_TYPES.map((d) => (
                <option key={d.value} value={d.value}>
                  {t(d.label)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{t("idForm.docNum")}</span>
            <input className="field" value={docNum} onChange={(e) => setDocNum(e.target.value)} required />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">
              {t("idForm.docExp")} <span className="text-ink-3">({t("idForm.optional")})</span>
            </span>
            <input type="date" className="field" value={docExp} onChange={(e) => setDocExp(e.target.value)} />
          </label>
        </div>
      </div>

      <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6">
        <h2 className="display text-[1.1rem] text-ink">{t("idForm.yourDocs")}</h2>
        <p className="mt-1 text-[12.5px] text-ink-3">{t("idForm.docsHint")}</p>
        <div className="mt-4 space-y-3">
          <FilePick label={t("idForm.selfie")} hint={t("idForm.selfieHint")} value={selfie} onChange={pick("selfie", setSelfie)} capture />
          <FilePick label={t("idForm.docFront")} value={front} onChange={pick("front", setFront)} />
          <FilePick
            label={t("idForm.docBack")}
            hint={t("idForm.docBackHint")}
            value={back}
            onChange={pick("back", setBack)}
          />
        </div>
      </div>

      {err && <p className="text-[13px] text-danger">{err}</p>}

      <button
        type="submit"
        disabled={busy}
        className="press flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-[14px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        {t("idForm.submit")}
      </button>
    </form>
  );
}

function FilePick({
  label,
  hint,
  value,
  onChange,
  capture,
}: {
  label: string;
  hint?: string;
  value: Upload;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  capture?: boolean;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const { t: tf } = useT();
  return (
    <div className="flex items-center justify-between gap-3 rounded-[10px] border border-line-soft bg-bone-2 px-4 py-3">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-ink">
          {label} {hint && <span className="font-normal text-ink-3">· {hint}</span>}
        </p>
        {value && <p className="truncate text-[12px] text-forest-2">{value.name}</p>}
      </div>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="press flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-line bg-bone px-3.5 text-[12.5px] font-medium text-ink hover:border-ink/30"
      >
        {value ? <Check className="h-3.5 w-3.5 text-green-2" /> : <Upload className="h-3.5 w-3.5" />}
        {value ? tf("idForm.replace") : tf("idForm.choose")}
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/heic,application/pdf"
        {...(capture ? { capture: "user" as const } : {})}
        className="hidden"
        onChange={onChange}
      />
    </div>
  );
}
