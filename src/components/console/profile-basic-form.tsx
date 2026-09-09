"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Loader2, Check, Camera, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PasswordField } from "@/components/auth/password-field";
import { useT } from "@/lib/i18n/provider";

/** Réglages de compte allégés pour l'équipe : photo, nom, téléphone, mot de passe. */
export function ProfileBasicForm({
  userId,
  email,
  initial,
}: {
  userId: string;
  email: string;
  initial: { full_name: string; phone: string; avatar_url: string | null };
}) {
  const router = useRouter();
  const { t } = useT();
  const fileRef = useRef<HTMLInputElement>(null);

  const [fullName, setFullName] = useState(initial.full_name);
  const [phone, setPhone] = useState(initial.phone);
  const [avatar, setAvatar] = useState<string | null>(initial.avatar_url);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || file.size > 5 * 1024 * 1024) {
      if (file) setErr(t("profileForm.photoTooBig"));
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
      setErr(t("profileForm.photoFailed"));
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

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setErr(null);
    const { error } = await createClient()
      .from("profiles")
      .update({ full_name: fullName || null, phone: phone || null })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      setErr(t("console.aptEd.saveFailed"));
      return;
    }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2500);
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    if (pw !== pw2) {
      setPwMsg(t("auth.mismatch"));
      return;
    }
    setPwBusy(true);
    const { error } = await createClient().auth.updateUser({ password: pw });
    setPwBusy(false);
    setPw("");
    setPw2("");
    setPwMsg(error ? t("profileForm.pwFailed") : t("profileForm.pwOk"));
  }

  return (
    <div className="space-y-5">
      <form onSubmit={save} className="rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-bone-2">
            {avatar ? (
              <Image src={avatar} alt="" fill className="object-cover" sizes="64px" />
            ) : (
              <span className="flex h-full w-full items-center justify-center text-[18px] font-medium text-ink-3">
                {(fullName || email || "?").slice(0, 1).toUpperCase()}
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
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
              {t("profileForm.changePhoto")}
            </button>
            {avatar && (
              <button
                type="button"
                onClick={removeAvatar}
                className="press flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] text-ink-3 hover:text-danger"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={onPickAvatar}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">
              {t("auth.fullName")}
            </span>
            <input className="field" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">
              {t("profileForm.phone")}
            </span>
            <input className="field" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{t("auth.email")}</span>
            <input className="field opacity-60" value={email} disabled />
          </label>
        </div>

        {err && <p className="mt-3 text-[13px] text-danger">{err}</p>}

        <button
          type="submit"
          disabled={saving}
          className="press mt-4 flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-6 text-[13.5px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : saved ? <Check className="h-4 w-4" /> : null}
          {saved ? t("console.action.saved") : t("console.action.save")}
        </button>
      </form>

      <form
        onSubmit={changePassword}
        className="rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6"
      >
        <h2 className="display text-[1.15rem] text-ink">{t("auth.password")}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <PasswordField
            label={t("profileForm.newPw")}
            value={pw}
            onChange={setPw}
            required={false}
            autoComplete="new-password"
          />
          <PasswordField
            label={t("auth.passwordConfirm")}
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
          {t("profileForm.changePw")}
        </button>
      </form>
    </div>
  );
}
