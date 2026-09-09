// notify — distribue une notification sur ses canaux (e-mail via Resend, push).
// Appelée par un trigger DB (pg_net) ou une autre Edge Function.
// POST { notification_id: string }   ou   { user_id, type, title, body, channels? }

import { createClient } from "jsr:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";
import { corsHeaders, preflight } from "../_shared/cors.ts";

const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "mailto:bonjour@les2palmiers.site";
if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") ?? "";
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") ?? "Les 2 Palmiers <noreply@les2palmiers.site>";
const EMAIL_PROVIDER = Deno.env.get("EMAIL_PROVIDER") ?? (RESEND_KEY ? "resend" : "log");
const APP_URL = Deno.env.get("APP_URL") ?? "https://les2palmiers.site";
// hôte dédié à l'espace équipe (si séparation par hôte activée)
const STAFF_URL = Deno.env.get("STAFF_URL") ?? Deno.env.get("APP_URL") ?? "https://les2palmiers.site";

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

  // destinataire équipe ou client ? (le lien e-mail doit pointer dans le bon espace)
  const { data: roleRows } = await admin
    .from("user_roles").select("role_id").eq("user_id", notif.user_id);
  const isTeam = (roleRows ?? []).some((r) =>
    ["admin", "staff", "coordinator"].includes(r.role_id as string),
  );

  // 3. e-mail
  if (channels.includes("email") && prefChannels.includes("email") && email) {
    results.email = await sendEmail(email, notif.title, notif.body ?? "", notif.data ?? {}, isTeam);
  }

  // 4. push web (VAPID)
  if (channels.includes("push") && prefChannels.includes("push") && VAPID_PUBLIC && VAPID_PRIVATE) {
    const { data: subs } = await admin
      .from("push_subscriptions").select("id, endpoint, keys").eq("user_id", notif.user_id);
    const base = isTeam ? STAFF_URL : APP_URL;
    const d = (notif.data ?? {}) as Record<string, unknown>;
    let path = isTeam ? "/staff" : "/app/notifications";
    if (d.conversation_id) path = isTeam ? `/staff/messages/${d.conversation_id}` : "/app/messages";
    else if (d.verification_id) path = isTeam ? "/staff/verifications" : "/app/verification";
    else if (d.payment_id) path = isTeam ? "/staff/paiements" : "/app/reservations";
    else if (d.reservation_id) path = isTeam ? "/staff/reservations" : "/app/reservations";

    const body = JSON.stringify({
      title: notif.title,
      body: notif.body ?? "",
      url: base + path,
      tag: notif.type,
    });
    let ok = 0, gone = 0;
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: s.keys as { p256dh: string; auth: string } },
          body,
        );
        ok++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await admin.from("push_subscriptions").delete().eq("id", s.id);
          gone++;
        }
      }
    }
    results.push = `sent:${ok} removed:${gone}`;
  }

  // 5. marquer envoyé
  if (payload.notification_id) {
    await admin.from("notifications").update({ sent_at: new Date().toISOString() })
      .eq("id", payload.notification_id);
  }

  return json({ ok: true, results });
});

async function sendEmail(
  to: string,
  subject: string,
  body: string,
  data: Record<string, unknown>,
  isTeam = false,
): Promise<string> {
  let link: string;
  if (isTeam) {
    link = data.conversation_id
      ? `${STAFF_URL}/staff/messages/${data.conversation_id}`
      : data.verification_id
      ? `${STAFF_URL}/staff/verifications`
      : data.reservation_id || data.contract_id
      ? `${STAFF_URL}/staff/reservations`
      : data.service_order_id
      ? `${STAFF_URL}/staff/demandes`
      : `${STAFF_URL}/staff`;
  } else {
    link = data.conversation_id
      ? `${APP_URL}/app/messages`
      : data.reservation_id
      ? `${APP_URL}/app/reservations`
      : `${APP_URL}/app/notifications`;
  }

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
