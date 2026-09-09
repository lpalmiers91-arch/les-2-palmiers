"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function AccountForm({
  initialName,
  initialPhone,
  initialLocale,
  email,
}: {
  initialName: string;
  initialPhone: string;
  initialLocale: string;
  email: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [locale, setLocale] = useState(initialLocale || "fr");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // reset password
  const [pw, setPw] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<string | null>(null);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase
      .from("profiles")
      .update({ full_name: name || null, phone: phone || null, locale })
      .eq("id", user!.id);
    setSaving(false);
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2500);
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return;
    setPwBusy(true);
    setPwMsg(null);
    const { error } = await createClient().auth.updateUser({ password: pw });
    setPwBusy(false);
    setPw("");
    setPwMsg(error ? "Impossible de modifier le mot de passe." : "Mot de passe mis à jour.");
  }

  return (
    <div className="space-y-8">
      <form onSubmit={saveProfile} className="rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6">
        <h2 className="display text-[1.15rem] text-ink">Profil</h2>
        <div className="mt-4 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Nom complet</span>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">
              Téléphone <span className="text-ink-3">(non vérifié)</span>
            </span>
            <input className="field tnum" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+229 …" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Adresse e-mail</span>
            <input className="field" value={email} disabled />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Langue</span>
            <select className="field" value={locale} onChange={(e) => setLocale(e.target.value)}>
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </label>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="press mt-5 flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-6 text-[13.5px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saved ? <><Check className="h-4 w-4" /> Enregistré</> : "Enregistrer"}
        </button>
      </form>

      <form onSubmit={changePassword} className="rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6">
        <h2 className="display text-[1.15rem] text-ink">Mot de passe</h2>
        <label className="mt-4 block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Nouveau mot de passe</span>
          <input
            type="password"
            className="field"
            value={pw}
            minLength={8}
            onChange={(e) => setPw(e.target.value)}
            placeholder="8 caractères minimum"
          />
        </label>
        {pwMsg && <p className="mt-2 text-[13px] text-ink-2">{pwMsg}</p>}
        <button
          type="submit"
          disabled={pwBusy || pw.length < 8}
          className="press mt-4 flex h-11 items-center justify-center gap-2 rounded-full border border-line px-6 text-[13.5px] font-medium text-ink hover:border-ink/30 disabled:opacity-50"
        >
          {pwBusy && <Loader2 className="h-4 w-4 animate-spin" />}
          Modifier le mot de passe
        </button>
      </form>
    </div>
  );
}
