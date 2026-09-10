// payment-webhook — reçoit les callbacks des PSP et confirme le paiement.
// URL : /functions/v1/payment-webhook/<provider>   (fedapay | kkiapay | stripe)
// À déclarer sans vérification JWT (verify_jwt = false) — la sécurité vient
// de la signature du PSP, vérifiée dans chaque adaptateur.

import { createClient } from "jsr:@supabase/supabase-js@2";
import { adapterFor } from "../_shared/payments.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const provider = url.pathname.split("/").filter(Boolean).pop() ?? "";
  const adapter = adapterFor(provider);
  if (!adapter) return new Response("unknown provider", { status: 404 });

  const result = await adapter.webhook(req);
  if (!result.ok) {
    // 200 pour éviter les retombées de retry sur un évènement ignoré volontairement
    return new Response(JSON.stringify({ ignored: result.reason }), {
      status: result.reason.startsWith("bad_") ? 400 : 200,
      headers: { "Content-Type": "application/json" },
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

  return new Response(JSON.stringify({ ok: true }), { headers: { "Content-Type": "application/json" } });
});
