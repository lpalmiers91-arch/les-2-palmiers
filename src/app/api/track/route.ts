import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { visitorCountry } from "@/lib/geo";
import { isSameOriginRequest } from "@/lib/csrf";

export const dynamic = "force-dynamic";

// SEC-07 : `p_utm` n'accepte QUE les trois clés UTM réellement envoyées par
// `src/lib/track.ts` (source/medium/campaign) — `.strict()` rejette toute
// autre clé au lieu de la passer telle quelle avec `as never`.
const UtmSchema = z
  .object({
    source: z.string().trim().max(80).optional(),
    medium: z.string().trim().max(80).optional(),
    campaign: z.string().trim().max(120).optional(),
  })
  .strict()
  .optional();

// `meta` transporte des attributs d'évènement variés selon l'appelant
// (cta_click, booking, …) : on borne la forme (clés courtes, valeurs
// scalaires uniquement — ni objet imbriqué ni tableau) plutôt que d'énumérer
// une liste de clés qui se périmerait à chaque nouvel évènement ajouté.
const MetaSchema = z.record(z.string().max(60), z.union([z.string().max(300), z.number(), z.boolean()])).optional();

const TrackSchema = z.object({
  session: z.string().trim().min(1).max(64),
  event: z.string().trim().min(1).max(40),
  path: z.string().trim().max(300).optional().nullable(),
  referrer: z.string().trim().max(300).optional().nullable(),
  utm: UtmSchema,
  meta: MetaSchema,
  ua: z.string().trim().max(300).optional().nullable(),
});

// Enregistre un évènement analytics en ajoutant le pays (en-tête CDN).
export async function POST(req: Request) {
  // SEC-08 : anti-CSRF léger — appelée uniquement par le JS first-party (src/lib/track.ts).
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const parsed = TrackSchema.safeParse(raw);
  if (!parsed.success) {
    // silencieux : le tracking ne doit jamais faire échouer la navigation du
    // visiteur, un évènement mal formé est simplement ignoré.
    return NextResponse.json({ ok: true });
  }
  const p = parsed.data;

  const country = await visitorCountry();
  const supabase = await createClient();

  await supabase.rpc("track_event", {
    p_session: p.session,
    p_event: p.event,
    p_path: p.path ?? undefined,
    p_referrer: p.referrer ?? undefined,
    p_utm: (p.utm ?? {}) as Record<string, string>,
    p_meta: (p.meta ?? {}) as Record<string, string | number | boolean>,
    p_ua: p.ua ?? undefined,
    p_country: country ?? undefined,
  });

  return NextResponse.json({ ok: true });
}
