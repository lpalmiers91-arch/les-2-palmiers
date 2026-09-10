// staff-booking — l'équipe enregistre une réservation prise hors ligne
// (téléphone, WhatsApp, sur place). Crée le compte invité si besoin.
// POST { apartment_id, start, end, guests, guest_email, guest_name, guest_phone,
//        channel, mark_paid: "none"|"deposit"|"full", note }

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, preflight } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  const json = (o: unknown, s = 200) =>
    new Response(JSON.stringify(o), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const supa = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: userRes } = await supa.auth.getUser();
    const caller = userRes?.user;
    if (!caller) return json({ error: "non authentifié" }, 401);

    const { data: canDo } = await supa.rpc("auth_has_permission", { perm: "reservations.update" });
    if (!canDo) return json({ error: "non autorisé" }, 403);

    const body = await req.json();
    const email = String(body.guest_email ?? "").trim().toLowerCase();
    const name = String(body.guest_name ?? "").trim();
    const phone = String(body.guest_phone ?? "").trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ error: "email_invalide" }, 400);
    if (!body.apartment_id || !body.start || !body.end) return json({ error: "champs_manquants" }, 400);

    // 1. compte invité : retrouvé ou créé
    let guestId: string | null = null;
    const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    guestId = existing.users.find((u) => u.email?.toLowerCase() === email)?.id ?? null;

    if (!guestId) {
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: name || null, created_by_staff: true },
      });
      if (cErr || !created.user) return json({ error: cErr?.message ?? "création compte impossible" }, 400);
      guestId = created.user.id;
    }

    // profil (upsert nom / téléphone)
    await admin.from("profiles").upsert(
      { id: guestId, full_name: name || null, phone: phone || null },
      { onConflict: "id" },
    );

    // 2. réservation via RPC (contexte appelant → contrôle de permission SQL)
    const { data: res, error: rErr } = await supa.rpc("staff_place_booking", {
      p_apartment: body.apartment_id,
      p_range: `[${body.start},${body.end})`,
      p_guest_id: guestId,
      p_guests: Number(body.guests) || 2,
      p_channel: body.channel ?? "phone",
      p_mark_paid: body.mark_paid ?? "none",
      p_note: body.note ?? null,
    });

    if (rErr) {
      const m = rErr.message;
      const code = /dates_unavailable/.test(m)
        ? "dates_unavailable"
        : /over_capacity/.test(m)
          ? "over_capacity"
          : /forbidden/.test(m)
            ? "forbidden"
            : "error";
      return json({ error: code, detail: m }, 400);
    }

    return json({ ok: true, reference: (res as { reference: string }).reference });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
