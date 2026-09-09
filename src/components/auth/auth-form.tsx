"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Mode = "signin" | "signup" | "reset";

const copy: Record<Mode, { title: string; cta: string; foot: string }> = {
  signin: { title: "Se connecter", cta: "Se connecter", foot: "Accédez à vos réservations et à vos services." },
  signup: { title: "Créer un compte", cta: "Créer mon compte", foot: "Quelques secondes, avec votre adresse e-mail." },
  reset: { title: "Mot de passe oublié", cta: "Envoyer le lien", foot: "Nous vous envoyons un lien de réinitialisation." },
};

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const suite = params.get("suite") || "/app";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const c = copy[mode];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    const supabase = createClient();

    try {
      if (mode === "signup") {
        if (password !== confirm) {
          setError("Les deux mots de passe ne correspondent pas.");
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: name || null },
            emailRedirectTo: `${location.origin}/auth/confirm?suite=${encodeURIComponent(suite)}`,
          },
        });
        if (error) throw error;
        setNotice(
          "Compte créé. Vérifiez votre boîte mail pour confirmer votre adresse.",
        );
      } else if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${location.origin}/auth/confirm?type=recovery`,
        });
        if (error) throw error;
        setNotice("Si un compte existe, un lien vient de vous être envoyé.");
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        let dest = suite;
        if (suite === "/app" && data.user) {
          const { data: roleRows } = await supabase
            .from("user_roles")
            .select("role_id")
            .eq("user_id", data.user.id);
          const roles = (roleRows ?? []).map((r) => r.role_id);
          if (roles.includes("admin")) dest = "/admin";
          else if (roles.some((r) => ["staff", "coordinator"].includes(r))) dest = "/staff";
        }
        router.push(dest);
        router.refresh();
        return;
      }
    } catch (err) {
      setError(translate(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="display text-[1.9rem] text-ink">{c.title}</h1>
      <p className="mt-2 text-[14px] text-ink-3">{c.foot}</p>

      <form onSubmit={submit} className="mt-7 space-y-4">
        {mode === "signup" && (
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Nom complet</span>
            <input
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              placeholder="Awa Koudjo"
            />
          </label>
        )}

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-2">Adresse e-mail</span>
          <input
            type="email"
            required
            className="field"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="vous@exemple.com"
          />
        </label>

        {mode !== "reset" && (
          <label className="block">
            <div className="mb-1.5 flex items-baseline justify-between">
              <span className="text-[13px] font-medium text-ink-2">Mot de passe</span>
              {mode === "signin" && (
                <Link href="/mot-de-passe" className="text-[12px] text-ink-3 underline underline-offset-2 hover:text-ink">
                  Oublié ?
                </Link>
              )}
            </div>
            <input
              type="password"
              required
              minLength={8}
              className="field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              placeholder={mode === "signup" ? "8 caractères minimum" : "••••••••"}
            />
          </label>
        )}

        {mode === "signup" && (
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">
              Confirmer le mot de passe
            </span>
            <input
              type="password"
              required
              minLength={8}
              className="field"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              placeholder="••••••••"
              aria-invalid={confirm.length > 0 && confirm !== password}
            />
            {confirm.length > 0 && confirm !== password && (
              <span className="mt-1.5 block text-[12px] text-danger">
                Les deux mots de passe ne correspondent pas.
              </span>
            )}
          </label>
        )}

        {error && (
          <p className="rounded-[10px] bg-danger/10 px-3 py-2 text-[13px] text-danger">{error}</p>
        )}
        {notice && (
          <p className="rounded-[10px] bg-ok/10 px-3 py-2 text-[13px] text-forest-2">{notice}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="press flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-[14px] font-medium text-bone transition-colors hover:bg-forest-2 disabled:opacity-50"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {c.cta}
        </button>
      </form>

      <p className="mt-6 text-center text-[13px] text-ink-3">
        {mode === "signin" ? (
          <>
            Pas encore de compte ?{" "}
            <Link href="/inscription" className="font-medium text-ink underline underline-offset-2">
              Créer un compte
            </Link>
          </>
        ) : (
          <>
            Déjà un compte ?{" "}
            <Link href="/connexion" className="font-medium text-ink underline underline-offset-2">
              Se connecter
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

function translate(err: unknown): string {
  const m = err instanceof Error ? err.message : String(err);
  if (/invalid login credentials/i.test(m)) return "E-mail ou mot de passe incorrect.";
  if (/email not confirmed/i.test(m)) return "Confirmez d'abord votre adresse e-mail (lien reçu par courriel).";
  if (/user already registered/i.test(m)) return "Un compte existe déjà avec cet e-mail.";
  if (/rate limit|too many/i.test(m)) return "Trop de tentatives. Réessayez dans quelques minutes.";
  if (/password should be at least/i.test(m)) return "Le mot de passe doit faire au moins 8 caractères.";
  return "Une erreur est survenue. Réessayez.";
}
