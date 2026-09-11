// admin-invite — l'admin invite un membre de l'équipe par e-mail.
// POST { email, full_name?, role: "staff"|"coordinator"|"admin" }

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, preflight, securityHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("APP_URL") ?? "https://les2palmiers.site";

const ROLES = ["staff", "coordinator", "admin"];

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;

  const json = (o: unknown, s = 200) =>
    new Response(JSON.stringify(o), { status: s, headers: { ...corsHeaders(req), ...securityHeaders, "Content-Type": "application/json" } });

  try {
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const supa = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: userRes } = await supa.auth.getUser();
    const caller = userRes?.user;
    if (!caller) return json({ error: "non authentifié" }, 401);

    const { data: callerRoles } = await supa.from("user_roles").select("role_id").eq("user_id", caller.id);
    if (!(callerRoles ?? []).some((r) => r.role_id === "admin")) {
      return json({ error: "réservé à l'administrateur" }, 403);
    }

    const { email, full_name, role } = await req.json();
    if (!email || !ROLES.includes(role)) return json({ error: "e-mail ou rôle invalide" }, 400);

    // invite (ou récupère le compte existant)
    let userId: string | null = null;
    let invited = false;
    const { data: inv, error: invErr } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: full_name ?? null },
      redirectTo: `${APP_URL}/auth/confirm?suite=/staff`,
    });

    if (inv?.user) {
      userId = inv.user.id;
      invited = true;
    } else if (invErr && /already been registered|already exists/i.test(invErr.message)) {
      // SEC-04 : compte déjà là — résolu par requête ciblée (index sur
      // auth.users.email), jamais par un listUsers() chargeant des centaines
      // de comptes en mémoire.
      const { data: existingId, error: lookupErr } = await admin.rpc("admin_find_user_by_email", {
        p_email: email,
      });
      if (lookupErr || !existingId) {
        // log interne seulement — la réponse HTTP ne distingue jamais
        // "déjà enregistré" de "erreur d'invitation" (anti-énumération).
        console.error("[admin-invite] compte introuvable après conflit d'invitation", email, lookupErr?.message);
        return json({ ok: true, invited: false });
      }
      userId = existingId as string;
    } else if (invErr) {
      console.error("[admin-invite] échec invitation", email, invErr.message);
      return json({ ok: true, invited: false });
    }

    if (!userId) {
      console.error("[admin-invite] invitation impossible (userId manquant)", email);
      return json({ ok: true, invited: false });
    }

    // profil + rôle
    await admin.from("profiles").upsert({ id: userId, full_name: full_name ?? null }, { onConflict: "id" });
    await admin.from("user_roles").upsert(
      { user_id: userId, role_id: role, granted_by: caller.id },
      { onConflict: "user_id,role_id", ignoreDuplicates: true },
    );
    if (role !== "admin") {
      await admin.from("staff_members").upsert(
        { user_id: userId, job_title: role === "coordinator" ? "Coordinateur" : "Staff" },
        { onConflict: "user_id", ignoreDuplicates: true },
      );
    }

    return json({ ok: true, invited });
  } catch (e) {
    // erreur générique uniquement — jamais le détail (message d'exception) au client.
    console.error("[admin-invite] erreur", e instanceof Error ? e.message : String(e));
    return json({ ok: true, invited: false });
  }
});
