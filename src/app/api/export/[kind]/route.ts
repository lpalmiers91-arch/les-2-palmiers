import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Row = Record<string, unknown>;

// VULN-07 : neutralisation de l'injection de formules (CSV / tableur).
// Une cellule qui commence par un caractère déclencheur est préfixée d'une
// apostrophe pour que le tableur la traite comme du texte.
const FORMULA_TRIGGERS = new Set(["=", "+", "-", "@", "\t", "\r"]);

function csv(rows: Row[]): string {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    let s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    if (s.length > 0 && FORMULA_TRIGGERS.has(s[0])) s = `'${s}`;
    return /[",\n\r;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.map(esc).join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\r\n");
}

const QUERIES: Record<string, (s: Awaited<ReturnType<typeof createClient>>) => Promise<Row[]>> = {
  async clients(s) {
    const { data } = await s
      .from("profiles")
      .select("id, full_name, phone, locale, city, country, created_at, last_seen_at")
      .order("created_at", { ascending: false });
    return (data ?? []) as Row[];
  },
  async reservations(s) {
    const { data } = await s
      .from("reservations")
      .select(
        "reference, status, date_range, guests_count, total_amount, amount_paid, deposit_amount, currency, created_at, guest:profiles!reservations_guest_id_fkey(full_name, phone)",
      )
      .order("created_at", { ascending: false });
    return (data ?? []).map((r) => ({
      ...r,
      guest_name: (r.guest as { full_name?: string } | null)?.full_name ?? "",
      guest_phone: (r.guest as { phone?: string } | null)?.phone ?? "",
      guest: undefined,
    })) as Row[];
  },
  async payments(s) {
    const { data } = await s
      .from("payments")
      .select("internal_ref, purpose, method, channel, amount, currency, status, created_at, paid_at")
      .order("created_at", { ascending: false });
    return (data ?? []) as Row[];
  },
  async reviews(s) {
    const { data } = await s
      .from("reviews")
      .select("rating, title, body, status, featured, staff_reply, created_at")
      .order("created_at", { ascending: false });
    return (data ?? []) as Row[];
  },
  async analytics(s) {
    const { data } = await s
      .from("analytics_events")
      .select("created_at, event, path, referrer, utm_source, utm_medium, utm_campaign, session_id")
      .gte("created_at", new Date(Date.now() - 90 * 864e5).toISOString())
      .order("created_at", { ascending: false })
      .limit(20000);
    return (data ?? []) as Row[];
  },
};

export async function GET(_req: Request, ctx: { params: Promise<{ kind: string }> }) {
  const { kind } = await ctx.params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: allowed } = await supabase.rpc("auth_has_permission", { perm: "reports.view" });
  if (!allowed) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const q = QUERIES[kind];
  if (!q) return NextResponse.json({ error: "unknown export" }, { status: 404 });

  const rows = await q(supabase);
  const body = csv(rows);
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="les2palmiers-${kind}-${date}.csv"`,
    },
  });
}
