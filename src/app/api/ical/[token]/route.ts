import { createClient } from "@/lib/supabase/server";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

function z(n: number) {
  return String(n).padStart(2, "0");
}
function stamp(d: Date): string {
  return `${d.getUTCFullYear()}${z(d.getUTCMonth() + 1)}${z(d.getUTCDate())}T${z(d.getUTCHours())}${z(d.getUTCMinutes())}${z(d.getUTCSeconds())}Z`;
}
function dateOnly(iso: string): string {
  return iso.replace(/-/g, "").slice(0, 8);
}
function fold(line: string): string {
  // RFC 5545 : lignes repliées à 75 octets
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let s = line;
  while (s.length > 75) {
    chunks.push(s.slice(0, 75));
    s = " " + s.slice(75);
  }
  chunks.push(s);
  return chunks.join("\r\n");
}

export async function GET(_req: Request, ctx: { params: Promise<{ token: string }> }) {
  const { token } = await ctx.params;
  const supabase = await createClient();

  const { data: apt } = await supabase
    .rpc("apartment_by_ical_token", { p_token: token })
    .maybeSingle();

  if (!apt) return new Response("Not found", { status: 404 });

  // VULN-10 : les évènements sont résolus PAR LE JETON, jamais par l'UUID
  // de l'appartement (fin de l'énumération des plannings par UUID).
  const { data: events } = await supabase.rpc("apartment_ical_events_by_token", {
    p_token: token,
  });

  const now = stamp(new Date());
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${site.name}//Reservations//FR`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    fold(`X-WR-CALNAME:${(apt as { name: string }).name} — ${site.name}`),
  ];

  for (const e of (events as { uid: string; starts: string; ends: string; summary: string }[]) ?? []) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:${e.uid}@les2palmiers.site`,
      `DTSTAMP:${now}`,
      `DTSTART;VALUE=DATE:${dateOnly(e.starts)}`,
      `DTEND;VALUE=DATE:${dateOnly(e.ends)}`,
      fold(`SUMMARY:${e.summary.replace(/[,;\\]/g, "\\$&")}`),
      "TRANSP:OPAQUE",
      "END:VEVENT",
    );
  }
  lines.push("END:VCALENDAR");

  return new Response(lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="les2palmiers-${token.slice(0, 8)}.ics"`,
      "Cache-Control": "public, max-age=1800",
    },
  });
}
