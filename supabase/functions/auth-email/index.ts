// auth-email — hook « Send Email » de Supabase Auth.
// Supabase délègue l'envoi de TOUS les e-mails d'authentification à cette fonction,
// qui les rend à la marque Les 2 Palmiers, dans la langue du destinataire, et les
// envoie via Resend. Config : Auth > Hooks > Send Email (HTTPS).
//
// verify_jwt = false (appel signé par webhook secret, pas par JWT).

import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  renderAuthEmail,
  resolveLocale,
  type AuthAction,
} from "../_shared/email/auth-templates.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") ?? "Les 2 Palmiers <noreply@les2palmiers.site>";
const HOOK_SECRET = Deno.env.get("SEND_EMAIL_HOOK_SECRET") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Comparaison à temps constant. */
function timingSafeEqual(a: string, b: string): boolean {
  const te = new TextEncoder();
  const ba = te.encode(a);
  const bb = te.encode(b);
  const len = Math.max(ba.length, bb.length, 1);
  let diff = ba.length ^ bb.length;
  for (let i = 0; i < len; i++) diff |= (ba[i] ?? 0) ^ (bb[i] ?? 0);
  return diff === 0;
}

/** Vérifie une signature « standard webhooks » (format Supabase). Fail-closed. */
async function verify(payload: string, headers: Headers): Promise<boolean> {
  // VULN-08 : sans secret configuré, on REFUSE (fail-closed).
  if (!HOOK_SECRET) {
    console.error("[auth-email] SEND_EMAIL_HOOK_SECRET manquant — requête refusée");
    return false;
  }
  const id = headers.get("webhook-id") ?? "";
  const ts = headers.get("webhook-timestamp") ?? "";
  const sigHeader = headers.get("webhook-signature") ?? "";
  if (!id || !ts || !sigHeader) return false;

  // anti-rejeu : l'horodatage ne doit pas dépasser 5 minutes.
  const age = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(age) || age > 300) {
    console.error("[auth-email] horodatage webhook hors tolérance (rejeu ?)");
    return false;
  }

  const secret = HOOK_SECRET.replace(/^v1,?/, "").replace(/^whsec_/, "");
  const key = await crypto.subtle.importKey(
    "raw",
    b64ToBytes(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${id}.${ts}.${payload}`));
  const expected = btoa(String.fromCharCode(...new Uint8Array(mac)));
  return sigHeader
    .split(" ")
    .map((p) => p.split(",")[1] ?? "")
    .some((s) => timingSafeEqual(s, expected));
}

function actionOf(t: string): AuthAction {
  if (t.startsWith("email_change")) return "email_change";
  if (t === "magiclink" || t === "magic_link") return "magiclink";
  if (t === "signup" || t === "confirmation") return "signup";
  if (t === "recovery") return "recovery";
  if (t === "invite") return "invite";
  if (t === "reauthentication") return "reauthentication";
  return "magiclink";
}

// SEC-10 : en-têtes de sécurité de base (pas de CORS ici — appelée uniquement
// serveur à serveur par le hook Supabase Auth, jamais depuis un navigateur).
const J = {
  "Content-Type": "application/json",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};
const jr = (obj: unknown, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: J });

async function sendViaResend(to: string, subject: string, html: string): Promise<Response> {
  return await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject, html }),
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method not allowed", { status: 405 });
  const raw = await req.text();

  if (!(await verify(raw, req.headers))) {
    return jr({ error: "invalid signature" }, 401);
  }

  let body: {
    user: { id: string; email: string; user_metadata?: Record<string, unknown> };
    email_data: {
      token: string;
      token_hash: string;
      token_hash_new?: string;
      redirect_to: string;
      email_action_type: string;
      site_url: string;
    };
  };
  try {
    body = JSON.parse(raw);
  } catch {
    return jr({ error: "bad payload" }, 400);
  }

  const { user, email_data: d } = body;
  const action = actionOf(d.email_action_type);

  // langue : métadonnée d'inscription, sinon profil, sinon français
  let locale = resolveLocale(user.user_metadata?.locale);
  if (locale === "fr" && !user.user_metadata?.locale) {
    const { data: prof } = await admin
      .from("profiles")
      .select("locale")
      .eq("id", user.id)
      .maybeSingle();
    if (prof?.locale) locale = resolveLocale(prof.locale);
  }

  const hash = action === "email_change" && d.token_hash_new ? d.token_hash_new : d.token_hash;
  const type =
    d.email_action_type === "email_change_new" ? "email_change" : d.email_action_type;
  const link =
    action === "reauthentication"
      ? ""
      : `${d.site_url}/auth/v1/verify?token=${encodeURIComponent(hash)}&type=${encodeURIComponent(
          type,
        )}&redirect_to=${encodeURIComponent(d.redirect_to || d.site_url)}`;

  const { subject, html } = renderAuthEmail({ locale, action, link, token: d.token });

  if (!RESEND_KEY) {
    console.log(`[auth-email:log] ${user.email} | ${action} | ${locale} | ${subject}`);
    return jr({});
  }

  const res = await sendViaResend(user.email, subject, html);
  if (!res.ok) {
    const txt = (await res.text()).slice(0, 200);
    console.error(`[auth-email] resend ${res.status}: ${txt}`);
    return jr({ error: `resend ${res.status}` }, 500);
  }
  return jr({});
});
