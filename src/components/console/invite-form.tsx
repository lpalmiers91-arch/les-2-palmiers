"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const FN = process.env.NEXT_PUBLIC_SUPABASE_FUNCTIONS_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function InviteForm() {
  const router = useRouter();
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
      if (!res.ok) throw new Error(data.error || "échec");
      setMsg({
        ok: true,
        text: data.invited
          ? "Invitation envoyée. Le membre reçoit un e-mail pour créer son mot de passe."
          : "Ce compte existait déjà — le rôle vient de lui être attribué.",
      });
      setEmail("");
      setName("");
      router.refresh();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : "Erreur" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6">
      <h2 className="display flex items-center gap-2 text-[1.1rem] text-ink">
        <UserPlus className="h-4 w-4 text-forest-2" /> Inviter un membre
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <input
          type="email"
          required
          placeholder="e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="field"
        />
        <input placeholder="nom (facultatif)" value={name} onChange={(e) => setName(e.target.value)} className="field" />
        <select value={role} onChange={(e) => setRole(e.target.value)} className="field sm:w-40">
          <option value="staff">Staff</option>
          <option value="coordinator">Coordinateur</option>
          <option value="admin">Admin</option>
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
        Envoyer l'invitation
      </button>
    </form>
  );
}
