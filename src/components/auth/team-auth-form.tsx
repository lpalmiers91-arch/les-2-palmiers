"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { audienceFromRoles, homeFor } from "@/lib/spaces";
import { PasswordField } from "./password-field";

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
    <div>
      <span className="eyebrow flex items-center gap-1.5">
        <ShieldCheck className="h-3.5 w-3.5" /> Accès réservé
      </span>
      <h1 className="display mt-3 text-[1.9rem] text-ink">Espace équipe</h1>
      <p className="mt-2 text-[14px] text-ink-3">
        Réservé au personnel et à l&apos;administration.
      </p>

      <form onSubmit={submit} className="mt-7 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Adresse e-mail</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            className="field"
            placeholder="vous@les2palmiers.site"
          />
        </label>

        <PasswordField
          label="Mot de passe"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />

        {error && (
          <p className="rounded-[10px] bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="press flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-[14px] font-medium text-bone transition-colors hover:bg-forest-2 disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Se connecter
        </button>
      </form>

      <p className="mt-6 text-[12px] text-ink-3">
        Un membre reçoit ses accès par e-mail après invitation de l&apos;administrateur.
      </p>
    </div>
  );
}
