import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { visitorCountry } from "@/lib/geo";

export const dynamic = "force-dynamic";

// Enregistre un évènement analytics en ajoutant le pays (en-tête CDN).
export async function POST(req: Request) {
  let p: Record<string, unknown>;
  try {
    p = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const country = await visitorCountry();
  const supabase = await createClient();

  await supabase.rpc("track_event", {
    p_session: String(p.session ?? "").slice(0, 64),
    p_event: String(p.event ?? "").slice(0, 40),
    p_path: p.path ? String(p.path).slice(0, 300) : undefined,
    p_referrer: p.referrer ? String(p.referrer).slice(0, 300) : undefined,
    p_utm: (p.utm ?? {}) as never,
    p_meta: (p.meta ?? {}) as never,
    p_ua: p.ua ? String(p.ua).slice(0, 300) : undefined,
    p_country: country ?? undefined,
  });

  return NextResponse.json({ ok: true });
}
