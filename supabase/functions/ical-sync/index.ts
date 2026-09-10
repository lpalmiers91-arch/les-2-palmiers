// ical-sync — importe les calendriers externes (Airbnb, Booking.com…) dans
// availability_blocks. Déclenché par pg_cron toutes les quelques heures, ou
// manuellement (POST { feed_id } pour un seul flux).

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, preflight } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

type Ev = { start: string; end: string };

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
    const res = await fetch(feed.url, { headers: { Accept: "text/calendar" }, signal: AbortSignal.timeout(15000) });
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
