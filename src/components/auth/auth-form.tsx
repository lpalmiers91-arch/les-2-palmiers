"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";
import { PasswordField } from "./password-field";
import { GoogleButton } from "./google-button";

type Mode = "signin" | "signup" | "reset";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const { t, locale } = useT();
  const suite = params.get("suite") || "/app";
  const [ref, setRef] = useState(params.get("ref") ?? "");

  const copy: Record<Mode, { title: string; cta: string; foot: string }> = {
    signin: { title: t("auth.signinTitle"), cta: t("auth.signinCta"), foot: t("auth.signinFoot") },
    signup: { title: t("auth.signupTitle"), cta: t("auth.signupCta"), foot: t("auth.signupFoot") },
    reset: { title: t("auth.resetTitle"), cta: t("auth.resetCta"), foot: t("auth.resetFoot") },
  };

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
          setError(t("auth.mismatch"));
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: name || null,
              locale,
              ...(ref.trim() ? { referral_code: ref.trim().toUpperCase() } : {}),
            },
            emailRedirectTo: `${location.origin}/auth/confirm?suite=${encodeURIComponent(suite)}`,
          },
        });
        if (error) throw error;
        setNotice(t("auth.signupDone"));
      } else if (mode === "reset") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${location.origin}/auth/confirm?type=recovery`,
        });
        if (error) throw error;
        setNotice(t("auth.resetDone"));
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
      setError(translateErr(err, t));
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
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{t("auth.fullName")}</span>
            <input
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </label>
        )}

        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{t("auth.email")}</span>
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
          <PasswordField
            label={t("auth.password")}
            value={password}
            onChange={setPassword}
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            placeholder={mode === "signup" ? t("auth.passwordHint") : "••••••••"}
            hint={
              mode === "signin" ? (
                <Link
                  href="/mot-de-passe"
                  className="text-[12px] text-ink-3 underline underline-offset-2 hover:text-ink"
                >
                  {t("auth.forgot")}
                </Link>
              ) : undefined
            }
          />
        )}

        {mode === "signup" && (
          <div>
            <PasswordField
              label={t("auth.passwordConfirm")}
              value={confirm}
              onChange={setConfirm}
              autoComplete="new-password"
              invalid={confirm.length > 0 && confirm !== password}
            />
            {confirm.length > 0 && confirm !== password && (
              <span className="mt-1.5 block text-[12px] text-danger">{t("auth.mismatch")}</span>
            )}
          </div>
        )}

        {mode === "signup" && (
          <label className="block">
            <span className="mb-1.5 block text-[13px] font-medium text-ink-2">
              {t("auth.referralCode")} <span className="text-ink-3">({t("auth.optional")})</span>
            </span>
            <input
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              placeholder="PALM-0000"
              autoComplete="off"
              className="field uppercase"
            />
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

      {mode !== "reset" && (
        <div className="mt-5">
          <div className="flex items-center gap-3 text-[12px] text-ink-3">
            <span className="h-px flex-1 bg-line-soft" />
            {t("auth.or")}
            <span className="h-px flex-1 bg-line-soft" />
          </div>
          <div className="mt-4">
            <GoogleButton suite={suite} label={t("auth.google")} />
          </div>
        </div>
      )}

      <p className="mt-6 text-center text-[13px] text-ink-3">
        {mode === "signin" ? (
          <>
            {t("auth.noAccount")}{" "}
            <Link href="/inscription" className="font-medium text-ink underline underline-offset-2">
              {t("auth.createOne")}
            </Link>
          </>
        ) : (
          <>
            {t("auth.haveAccount")}{" "}
            <Link href="/connexion" className="font-medium text-ink underline underline-offset-2">
              {t("auth.signinCta")}
            </Link>
          </>
        )}
      </p>
    </div>
  );
}

function translateErr(err: unknown, t: (k: string) => string): string {
  const m = err instanceof Error ? err.message : String(err);
  if (/invalid login credentials/i.test(m)) return t("auth.errInvalid");
  if (/email not confirmed/i.test(m)) return t("auth.errNotConfirmed");
  if (/user already registered/i.test(m)) return t("auth.errExists");
  if (/rate limit|too many/i.test(m)) return t("auth.errRate");
  if (/password should be at least/i.test(m)) return t("auth.errShort");
  return t("common.error");
}
