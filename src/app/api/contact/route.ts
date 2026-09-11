import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isSameOriginRequest } from "@/lib/csrf";
import { LOCALES } from "@/lib/i18n/languages";

export const dynamic = "force-dynamic";

function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

// SEC-07 : validation structurée du corps de la requête. Les bornes de
// longueur reprennent celles déjà appliquées côté base (submit_contact_message :
// nom >= 2, message entre 10 et 4000 caractères) pour ne rejeter côté route
// aucune saisie que la RPC accepterait — la validation Zod est un filtre en
// amont, pas une règle métier concurrente.
const ContactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(200),
  message: z.string().trim().min(10).max(4000),
  phone: z.string().trim().max(30).optional().nullable(),
  subject: z.string().trim().max(150).optional().nullable(),
  // liste blanche des 10 langues réellement supportées par le site (pas un
  // sous-ensemble arbitraire) — évite de rejeter un visiteur non francophone/anglophone.
  locale: z.enum(LOCALES).optional().nullable(),
  hp: z.string().optional(), // honeypot
});

export async function POST(req: Request) {
  // SEC-08 : anti-CSRF léger — seul le JS first-party du site peut appeler cette route.
  if (!isSameOriginRequest(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const parsed = ContactSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }
  const { name, email, message, phone, subject, locale, hp } = parsed.data;

  // honeypot : un bot remplit tout, y compris ce champ masqué
  if (hp) return NextResponse.json({ ok: true });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_contact_message", {
    p_name: name,
    p_email: email,
    p_message: message,
    p_phone: phone ?? undefined,
    p_subject: subject ?? undefined,
    p_locale: locale ?? undefined,
    p_rl_key: clientIp(req),
  });

  if (error) {
    const code = /rate_limited/.test(error.message)
      ? "rate_limited"
      : /email_invalid|name_too_short|message_too/.test(error.message)
        ? "invalid"
        : "error";
    return NextResponse.json({ error: code }, { status: code === "rate_limited" ? 429 : 400 });
  }

  return NextResponse.json({ ok: true, id: data });
}
