import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

export async function POST(req: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const { name, email, message, phone, subject, locale, hp } = payload as Record<string, string>;

  // honeypot : un bot remplit tout, y compris ce champ masqué
  if (hp) return NextResponse.json({ ok: true });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("submit_contact_message", {
    p_name: name ?? "",
    p_email: email ?? "",
    p_message: message ?? "",
    p_phone: phone ?? null,
    p_subject: subject ?? null,
    p_locale: locale ?? null,
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
