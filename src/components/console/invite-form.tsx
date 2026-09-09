"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";

import { FUNCTIONS_URL as FN, SUPABASE_ANON_KEY as ANON } from "@/lib/supabase/config";

export function InviteForm() {
  const router = useRouter();
  const { t } = useT();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("staff");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const {
        data: { session },
      } = await createClient().auth.getSession();
      const res = await fetch(`${FN}/admin-invite`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token ?? ANON}`,
          apikey: ANON,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, full_name: name || null, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "error");
      setMsg({
        ok: true,
        text: data.invited ? t("console.invite.sent") : t("console.invite.alreadyExisted"),
      });
      setEmail("");
      setName("");
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : t("common.error") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6">
      <h2 className="display flex items-center gap-2 text-[1.1rem] text-ink">
        <UserPlus className="h-4 w-4 text-forest-2" /> {t("console.invite.title")}
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <input
          type="email"
          required
          placeholder={t("auth.email")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field"
        />
        <input
          placeholder={t("console.invite.nameOptional")}
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="field"
        />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="field sm:w-40">
          <option value="staff">{t("console.invite.roleStaff")}</option>
          <option value="coordinator">{t("console.invite.roleCoordinator")}</option>
          <option value="admin">{t("console.invite.roleAdmin")}</option>
        </select>
      </div>
      {msg && (
        <p className={`mt-3 text-[13px] ${msg.ok ? "text-forest-2" : "text-danger"}`}>{msg.text}</p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="press mt-4 flex h-10 items-center justify-center gap-2 rounded-full bg-ink px-5 text-[13px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        {t("console.invite.send")}
      </button>
    </form>
  );
}
