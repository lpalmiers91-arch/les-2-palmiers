// payment-webhook — reçoit les callbacks des PSP et confirme le paiement.
// URL : /functions/v1/payment-webhook/<provider>   (fedapay | kkiapay | stripe)
// À déclarer sans vérification JWT (verify_jwt = false) — la sécurité vient
// de la signature du PSP, vérifiée dans chaque adaptateur.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { adapterFor } from "../_shared/payments.ts";
import { securityHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
// SEC-10 : pas de CORS ici — callbacks serveur à serveur des PSP uniquement.
const JSON_HEADERS = { "Content-Type": "application/json", ...securityHeaders };

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const provider = url.pathname.split("/").filter(Boolean).pop() ?? "";
  const adapter = adapterFor(provider);
  if (!adapter) return new Response("unknown provider", { status: 404, headers: securityHeaders });

  const result = await adapter.webhook(req);
  if (!result.ok) {
    // config manquante -> 500 (le PSP retentera, l'incident est visible)
    // signature / corps invalides -> 400 (rejet ferme)
    // ignored_* -> 200 (évènement volontairement non traité, pas de retry)
    const status = result.reason === "missing_secret_config"
      ? 500
      : result.reason.startsWith("bad_") || result.reason.startsWith("no_")
      ? 400
      : 200;
    return new Response(JSON.stringify({ ignored: result.reason }), {
      status,
      headers: JSON_HEADERS,
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  if (result.status === "paid") {
    await admin.rpc("payment_mark_paid_external", {
      p_internal_ref: result.ref,
      p_provider: provider,
      p_provider_ref: result.providerRef,
      p_raw: result.raw as Record<string, unknown>,
    });
  } else {
    await admin.rpc("payment_mark_failed_external", {
      p_internal_ref: result.ref,
      p_raw: result.raw as Record<string, unknown>,
    });
  }

  return new Response(JSON.stringify({ ok: true }), { headers: JSON_HEADERS });
});
