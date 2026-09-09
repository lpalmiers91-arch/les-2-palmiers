// notify — distribue une notification sur ses canaux (e-mail via Resend, push).
// Appelée par un trigger DB (pg_net) ou une autre Edge Function.
// POST { notification_id: string }   ou   { user_id, type, title, body, channels? }

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, preflight } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") ?? "Les 2 Palmiers <noreply@les2palmiers.site>";
const EMAIL_PROVIDER = Deno.env.get("EMAIL_PROVIDER") ?? (RESEND_KEY ? "resend" : "log");
const APP_URL = Deno.env.get("APP_URL") ?? "https://les2palmiers.site";

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const payload = await req.json().catch(() => ({}));

  // 1. résoudre la notification
  let notif = payload;
  if (payload.notification_id) {
    const { data } = await admin
      .from("notifications").select("*").eq("id", payload.notification_id).maybeSingle();
    if (!data) return json({ error: "notification introuvable" }, 404);
    notif = data;
  }
  if (!notif.user_id || !notif.title) return json({ error: "payload incomplet" }, 400);

  const channels: string[] = notif.channels ?? ["in_app", "email"];
  const results: Record<string, string> = {};

  // 2. destinataire
  const { data: authUser } = await admin.auth.admin.getUserById(notif.user_id);
  const email = authUser?.user?.email;
  const { data: profile } = await admin
    .from("profiles").select("full_name, preferences").eq("id", notif.user_id).maybeSingle();
  const prefs = (profile?.preferences ?? {}) as Record<string, unknown>;
  const prefChannels = (prefs.channels as string[] | undefined) ?? channels;

  // 3. e-mail
  if (channels.includes("email") && prefChannels.includes("email") && email) {
    results.email = await sendEmail(email, notif.title, notif.body ?? "", notif.data ?? {});
  }

  // 4. push (VAPID) — stub : nécessite npm:web-push + clés VAPID
  if (channels.includes("push") && prefChannels.includes("push")) {
    const { data: subs } = await admin
      .from("push_subscriptions").select("id").eq("user_id", notif.user_id);
    results.push = subs?.length ? "skipped:web-push-not-configured" : "no-subscription";
  }

  // 5. marquer envoyé
  if (payload.notification_id) {
    await admin.from("notifications").update({ sent_at: new Date().toISOString() })
      .eq("id", payload.notification_id);
  }

  return json({ ok: true, results });
});

async function sendEmail(to: string, subject: string, body: string, data: Record<string, unknown>): Promise<string> {
  const link = data.conversation_id
    ? `${APP_URL}/app/messages`
    : data.reservation_id
    ? `${APP_URL}/app/reservations`
    : `${APP_URL}/app/notifications`;

  const html = `<!doctype html><html lang="fr"><body style="margin:0;background:#f8f5ec;">
<table role="presentation" width="100%" style="background:#f8f5ec;padding:32px 12px;font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif;"><tr><td align="center">
<table role="presentation" width="480" style="max-width:480px;background:#fff;border:1px solid #e7e0cf;border-radius:14px;overflow:hidden;">
<tr><td style="background:#22392c;padding:24px 32px;text-align:center;">
<div style="color:#f8f5ec;font-size:16px;letter-spacing:.16em;font-weight:600;">LES 2 PALMIERS</div></td></tr>
<tr><td style="padding:30px 32px;color:#15160f;font-size:15px;line-height:1.6;">
<p style="margin:0 0 10px;font-weight:600;">${escapeHtml(subject)}</p>
<p style="margin:0 0 22px;color:#4a4a3e;">${escapeHtml(body)}</p>
<div style="text-align:center;"><a href="${link}" style="background:#b6903f;color:#15160f;text-decoration:none;font-weight:600;padding:12px 26px;border-radius:999px;display:inline-block;font-size:14px;">Ouvrir</a></div>
</td></tr>
<tr><td style="padding:16px 32px;border-top:1px solid #ede6d6;color:#8f8c7d;font-size:13px;text-align:center;">les2palmiers.site</td></tr>
</table></td></tr></table></body></html>`;

  if (EMAIL_PROVIDER !== "resend") {
    console.log(`[notify:log] -> ${to} | ${subject} | ${body}`);
    return "logged";
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: EMAIL_FROM, to, subject: `${subject} — Les 2 Palmiers`, html }),
  });
  return res.ok ? "sent" : `error:${res.status}:${(await res.text()).slice(0, 120)}`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
