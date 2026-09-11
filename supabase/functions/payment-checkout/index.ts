// payment-checkout — démarre le règlement d'un paiement `pending` avec le PSP actif.
// POST { payment_ref }  ->  { mode: "sim" }  ou  { mode: "redirect", url }
//   "sim"      : le client garde le flux simulé existant
//   "redirect" : le client redirige vers l'URL du PSP

import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders, preflight, securityHeaders } from "../_shared/cors.ts";
import { adapterFor, type CheckoutInput } from "../_shared/payments.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APP_URL = Deno.env.get("APP_URL") ?? "https://les2palmiers.site";

Deno.serve(async (req) => {
  const pf = preflight(req);
  if (pf) return pf;
  const json = (o: unknown, s = 200) =>
    new Response(JSON.stringify(o), { status: s, headers: { ...corsHeaders(req), ...securityHeaders, "Content-Type": "application/json" } });

  try {
    const jwt = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
    const supa = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: userRes } = await supa.auth.getUser();
    const user = userRes?.user;
    if (!user) return json({ error: "non authentifié" }, 401);

    const { payment_ref } = await req.json();
    if (!payment_ref) return json({ error: "payment_ref requis" }, 400);

    const { data: pay } = await supa
      .from("payments")
      .select("id, internal_ref, amount, currency, status, purpose, payer_id, reservation_id, service_order_id")
      .eq("internal_ref", payment_ref)
      .maybeSingle();
    if (!pay) return json({ error: "paiement introuvable" }, 404);
    if (pay.payer_id !== user.id) return json({ error: "non autorisé" }, 403);
    if (pay.status !== "pending") return json({ mode: "done", status: pay.status });

    const { data: cfg } = await admin.rpc("payment_settings_public");
    const provider: string = cfg?.provider ?? "sim";

    if (provider === "sim") return json({ mode: "sim" });

    const adapter = adapterFor(provider);
    if (!adapter) return json({ mode: "sim" });

    const input: CheckoutInput = {
      internalRef: pay.internal_ref,
      amount: Math.round(Number(pay.amount)),
      currency: cfg?.currency ?? pay.currency ?? "XOF",
      description: `Les 2 Palmiers — ${pay.purpose}`,
      customerEmail: user.email ?? null,
      customerName: user.user_metadata?.full_name ?? null,
      returnUrl: `${APP_URL}/app/reservations`,
      mode: cfg?.mode === "live" ? "live" : "test",
    };

    const out = await adapter.checkout(input);
    if ("url" in out) return json({ mode: "redirect", url: out.url });

    // secret absent ou widget client -> on retombe sur le simulateur
    return json({ mode: "sim", note: out.error });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
