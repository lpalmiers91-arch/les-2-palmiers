"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Check, Camera, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { LANGUAGES } from "@/lib/i18n/languages";
import { PasswordField } from "@/components/auth/password-field";
import { useT } from "@/lib/i18n/provider";

type Profile = {
  full_name: string;
  phone: string;
  locale: string;
  avatar_url: string | null;
  address: string;
  city: string;
  country: string;
  postal_code: string;
  date_of_birth: string;
  nationality: string;
  bio: string;
};

export function AccountForm({
  userId,
  email,
  initial,
}: {
  userId: string;
  email: string;
  initial: Profile;
}) {
  const router = useRouter();
  const { t } = useT();
  const fileRef = useRef<HTMLInputElement>(null);

  const [p, setP] = useState<Profile>(initial);
  const [avatar, setAvatar] = useState<string | null>(initial.avatar_url);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  function set<K extends keyof Profile>(k: K, v: Profile[K]) {
    setP((prev) => ({ ...prev, [k]: v }));
  }

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErr(t("acctForm.photoTooBig"));
      return;
    }
    setUploading(true);
    setErr(null);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${userId}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", userId);
      setAvatar(data.publicUrl);
      router.refresh();
    } catch {
      setErr(t("acctForm.photoFailed"));
    } finally {
      setUploading(false);
    }
  }

  async function removeAvatar() {
    setUploading(true);
    await createClient().from("profiles").update({ avatar_url: null }).eq("id", userId);
    setAvatar(null);
    setUploading(false);
    router.refresh();
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setErr(null);
    const { error } = await createClient()
      .from("profiles")
      .update({
        full_name: p.full_name || null,
        phone: p.phone || null,
        locale: p.locale,
        address: p.address || null,
        city: p.city || null,
        country: p.country || null,
        postal_code: p.postal_code || null,
        date_of_birth: p.date_of_birth || null,
        nationality: p.nationality || null,
        bio: p.bio || null,
      })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      setErr(t("acctForm.saveFailed"));
      return;
    }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2500);
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return;
    if (pw !== pw2) {
      setPwMsg(t("acctForm.pwMismatch"));
      return;
    }
    setPwBusy(true);
    setPwMsg(null);
    const { error } = await createClient().auth.updateUser({ password: pw });
    setPwBusy(false);
    setPw("");
    setPw2("");
    setPwMsg(error ? t("acctForm.pwFailed") : t("acctForm.pwUpdated"));
  }

  const initials = (p.full_name || email).slice(0, 2).toUpperCase();

  return (
    <div className="space-y-8">
      <form onSubmit={saveProfile} className="rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6">
        <h2 className="display text-[1.15rem] text-ink">{t("acctForm.profile")}</h2>

        {/* photo */}
        <div className="mt-5 flex items-center gap-4">
          <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-bone-2 ring-1 ring-line">
            {avatar ? (
              <Image src={avatar} alt="" fill sizes="80px" className="object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[20px] font-medium text-ink-3">
                {initials}
              </span>
            )}
            {uploading && (
              <span className="absolute inset-0 flex items-center justify-center bg-ink/40">
                <Loader2 className="h-5 w-5 animate-spin text-bone" />
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="press flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-[13px] font-medium text-ink hover:border-ink/30 disabled:opacity-50"
            >
              <Camera className="h-3.5 w-3.5" /> {avatar ? t("acctForm.change") : t("acctForm.addPhoto")}
            </button>
            {avatar && (
              <button
                type="button"
                onClick={removeAvatar}
                disabled={uploading}
                className="press flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] text-ink-3 hover:text-danger disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> {t("acctForm.remove")}
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/avif"
              className="hidden"
              onChange={onPickAvatar}
            />
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Field label={t("acctForm.fullName")}>
            <input className="field" value={p.full_name} onChange={(e) => set("full_name", e.target.value)} />
          </Field>
          <Field label={t("acctForm.phone")} hint={t("acctForm.unverified")}>
            <input
              className="field tnum"
              value={p.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="+229 …"
            />
          </Field>
          <Field label={t("acctForm.email")}>
            <input className="field" value={email} disabled />
          </Field>
          <Field label={t("acctForm.dob")}>
            <input
              type="date"
              className="field"
              value={p.date_of_birth}
              onChange={(e) => set("date_of_birth", e.target.value)}
            />
          </Field>
          <Field label={t("acctForm.nationality")}>
            <input
              className="field"
              value={p.nationality}
              onChange={(e) => set("nationality", e.target.value)}
              placeholder={t("acctForm.nationalityPlaceholder")}
            />
          </Field>
          <Field label={t("acctForm.language")}>
            <select className="field" value={p.locale} onChange={(e) => set("locale", e.target.value)}>
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("acctForm.address")} className="sm:col-span-2">
            <input className="field" value={p.address} onChange={(e) => set("address", e.target.value)} />
          </Field>
          <Field label={t("acctForm.city")}>
            <input className="field" value={p.city} onChange={(e) => set("city", e.target.value)} />
          </Field>
          <Field label={t("acctForm.country")}>
            <input className="field" value={p.country} onChange={(e) => set("country", e.target.value)} />
          </Field>
          <Field label={t("acctForm.about")} hint={t("acctForm.optional")} className="sm:col-span-2">
            <textarea
              className="field min-h-[80px] resize-y"
              value={p.bio}
              onChange={(e) => set("bio", e.target.value)}
              placeholder={t("acctForm.aboutPlaceholder")}
            />
          </Field>
        </div>

        {err && <p className="mt-4 text-[13px] text-danger">{err}</p>}

        <button
          type="submit"
          disabled={saving}
          className="press mt-5 flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-6 text-[13.5px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saved ? (
            <>
              <Check className="h-4 w-4" /> {t("acctForm.saved")}
            </>
          ) : (
            t("acctForm.save")
          )}
        </button>
      </form>

      <form onSubmit={changePassword} className="rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6">
        <h2 className="display text-[1.15rem] text-ink">{t("acctForm.password")}</h2>
        <p className="mt-1 text-[13px] text-ink-3">{t("acctForm.pwHelp")}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <PasswordField
            label={t("acctForm.newPassword")}
            value={pw}
            onChange={setPw}
            required={false}
            autoComplete="new-password"
            placeholder={t("acctForm.pwHint")}
          />
          <PasswordField
            label={t("acctForm.confirm")}
            value={pw2}
            onChange={setPw2}
            required={false}
            autoComplete="new-password"
            invalid={pw2.length > 0 && pw2 !== pw}
          />
        </div>
        {pwMsg && <p className="mt-3 text-[13px] text-ink-2">{pwMsg}</p>}
        <button
          type="submit"
          disabled={pwBusy || pw.length < 8}
          className="press mt-4 flex h-11 items-center justify-center gap-2 rounded-full border border-line px-6 text-[13.5px] font-medium text-ink hover:border-ink/30 disabled:opacity-50"
        >
          {pwBusy && <Loader2 className="h-4 w-4 animate-spin" />}
          {t("acctForm.changePassword")}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  hint,
  className = "",
  children,
}: {
  label: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-[13px] font-medium text-ink-2">
        {label} {hint && <span className="text-ink-3">({hint})</span>}
      </span>
      {children}
    </label>
  );
}
