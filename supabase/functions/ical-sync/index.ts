// ical-sync — importe les calendriers externes (Airbnb, Booking.com…) dans
// availability_blocks. Déclenché par pg_cron toutes les quelques heures, ou
// manuellement (POST { feed_id } pour un seul flux).

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, preflight } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const CRON_SECRET = Deno.env.get("ICAL_SYNC_SECRET") ?? "";

type Ev = { start: string; end: string };

function timingSafeEqual(a: string, b: string): boolean {
  const te = new TextEncoder();
  const ba = te.encode(a);
  const bb = te.encode(b);
  const len = Math.max(ba.length, bb.length, 1);
  let diff = ba.length ^ bb.length;
  for (let i = 0; i < len; i++) diff |= (ba[i] ?? 0) ^ (bb[i] ?? 0);
  return diff === 0;
}

// VULN-09 (SSRF) : n'autorise que du https public ; rejette localhost, IP
// privées / link-local / loopback, et l'endpoint de métadonnées cloud.
function isSafeFeedUrl(raw: string): boolean {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "::" ||
    host === "::1" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal")
  ) return false;
  // IPv4 littérale ?
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||               // link-local + métadonnées cloud
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)        // CGNAT
    ) return false;
  }
  // IPv6 littérale (loopback / ULA / link-local) ?
  if (host.includes(":")) {
    if (host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80")) {
      return false;
    }
  }
  return true;
}

function unfold(text: string): string {
  return text.replace(/\r\n[ \t]/g, "").replace(/\n[ \t]/g, "");
}

function toIso(raw: string): string | null {
  // DTSTART;VALUE=DATE:20260514  ou  DTSTART:20260514T140000Z
  const m = raw.match(/(\d{4})(\d{2})(\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

function parseIcs(text: string): Ev[] {
  const body = unfold(text);
  const events: Ev[] = [];
  const blocks = body.split("BEGIN:VEVENT").slice(1);
  for (const b of blocks) {
    const chunk = b.split("END:VEVENT")[0];
    const s = chunk.match(/DTSTART[^:]*:([0-9TZ]+)/);
    const e = chunk.match(/DTEND[^:]*:([0-9TZ]+)/);
    if (!s) continue;
    const start = toIso(s[1]);
    let end = e ? toIso(e[1]) : null;
    if (!start) continue;
    if (!end) {
      const d = new Date(start + "T00:00:00Z");
      d.setUTCDate(d.getUTCDate() + 1);
      end = d.toISOString().slice(0, 10);
    }
    if (end <= start) continue;
    events.push({ start, end });
  }
  return events;
}

async function syncFeed(admin: ReturnType<typeof createClient>, feed: { id: string; url: string }) {
  try {
    if (!isSafeFeedUrl(feed.url)) throw new Error("url_rejected");
    const res = await fetch(feed.url, {
      headers: { Accept: "text/calendar" },
      redirect: "error", // pas de suivi de redirection (contournement SSRF)
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    if (!/BEGIN:VCALENDAR/i.test(text)) throw new Error("not an iCalendar feed");
    const events = parseIcs(text);
    const { data, error } = await admin.rpc("apply_ical_feed", { p_feed: feed.id, p_events: events });
    if (error) throw new Error(error.message);
    return { feed: feed.id, imported: data };
  } catch (e) {
    await admin.rpc("mark_ical_feed_error", { p_feed: feed.id, p_msg: e instanceof Error ? e.message : String(e) });
    return { feed: feed.id, error: e instanceof Error ? e.message : String(e) };
  }
}

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  const json = (o: unknown, s = 200) =>
    new Response(JSON.stringify(o), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  // VULN-09 : authentification obligatoire.
  //  * appel planifié (pg_cron)  -> header x-cron-secret
  //  * appel manuel (console)    -> JWT d'un membre ayant 'apartments.edit'
  const cronHeader = req.headers.get("x-cron-secret") ?? "";
  const isCron = CRON_SECRET !== "" && timingSafeEqual(cronHeader, CRON_SECRET);
  if (!isCron) {
    if (!CRON_SECRET) return json({ error: "missing_secret_config" }, 503);
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (!jwt) return json({ error: "unauthorized" }, 401);
    const supa = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: u } = await supa.auth.getUser();
    if (!u?.user) return json({ error: "unauthorized" }, 401);
    const { data: allowed } = await supa.rpc("auth_has_permission", { perm: "apartments.edit" });
    if (allowed !== true) return json({ error: "forbidden" }, 403);
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  let onlyFeed: string | null = null;
  try {
    const b = await req.json();
    onlyFeed = b?.feed_id ?? null;
  } catch {
    /* pas de corps : synchro globale */
  }

  let q = admin.from("apartment_ical_feeds").select("id, url").eq("active", true);
  if (onlyFeed) q = admin.from("apartment_ical_feeds").select("id, url").eq("id", onlyFeed);

  const { data: feeds, error } = await q;
  if (error) return json({ error: error.message }, 500);

  const results = [];
  for (const f of feeds ?? []) {
    results.push(await syncFeed(admin, f as { id: string; url: string }));
  }
  return json({ ok: true, synced: results.length, results });
});
