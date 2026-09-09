"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { audienceFromRoles, homeFor } from "@/lib/spaces";

export function TeamAuthForm() {
  const router = useRouter();
  const params = useSearchParams();
  const suite = params.get("suite") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      const { data: roleRows } = await supabase
        .from("user_roles")
        .select("role_id")
        .eq("user_id", data.user.id);
      const roles = (roleRows ?? []).map((r) => r.role_id as string);

      if (audienceFromRoles(roles) !== "team") {
        await supabase.auth.signOut();
        setError("Ce compte n'a pas d'accès à l'espace équipe.");
        return;
      }

      const dest =
        suite && (suite.startsWith("/staff") || suite.startsWith("/admin"))
          ? suite
          : homeFor("team", roles);
      router.push(dest);
      router.refresh();
    } catch (err) {
      const m = err instanceof Error ? err.message : "";
      setError(
        /invalid login credentials/i.test(m)
          ? "E-mail ou mot de passe incorrect."
          : /email not confirmed/i.test(m)
            ? "Adresse e-mail non confirmée."
            : "Connexion impossible. Réessayez.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="w-full max-w-[360px]">
      <div className="flex items-center gap-2 text-bone/60">
        <Lock className="h-4 w-4" />
        <span className="text-[12px] font-medium uppercase tracking-[0.18em]">Accès réservé</span>
      </div>
      <h1 className="display mt-3 text-[1.9rem] text-bone">Espace équipe</h1>
      <p className="mt-2 text-[14px] text-bone/60">
        Réservé aux membres du personnel et à l&apos;administration.
      </p>

      <div className="mt-7 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-bone/80">Adresse e-mail</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="h-12 w-full rounded-[12px] border border-bone/20 bg-bone/5 px-4 text-[14px] text-bone outline-none placeholder:text-bone/30 focus:border-bone/50"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-bone/80">Mot de passe</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="h-12 w-full rounded-[12px] border border-bone/20 bg-bone/5 px-4 text-[14px] text-bone outline-none placeholder:text-bone/30 focus:border-bone/50"
          />
        </label>
      </div>

      {error && (
        <p className="mt-4 rounded-[10px] bg-danger/15 px-3 py-2 text-[13px] text-danger">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="press mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brass text-[14px] font-medium text-ink hover:bg-brass-2 disabled:opacity-50"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Se connecter
      </button>
      <p className="mt-4 text-[12px] text-bone/40">
        Un membre reçoit ses accès par e-mail après invitation de l&apos;administrateur.
      </p>
    </form>
  );
}
