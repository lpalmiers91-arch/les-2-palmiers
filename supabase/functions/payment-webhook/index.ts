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

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

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

    // CORRECTIF 7 : trace un rejet de signature/corps — ces deux cas sont
    // les seuls qui indiquent une tentative de forgerie (une signature
    // absente/invalide ou un corps illisible), par opposition à un webhook
    // légitime mais ignoré (ignored_*) ou une config serveur manquante.
    // Colonnes réelles de audit_log (vérifiées dans 20260909180001) :
    // actor_id/actor_role/action/entity/entity_id/before/after/at — PAS
    // table_name/record_id/new_data. Non bloquant : un échec d'écriture du
    // log ne doit jamais empêcher de répondre au PSP.
    if (result.reason === "bad_signature" || result.reason === "bad_body") {
      try {
        await admin.from("audit_log").insert({
          actor_id: null,
          actor_role: "webhook",
          action: "webhook_rejected",
          entity: "payment_webhook",
          entity_id: provider,
          after: {
            reason: result.reason,
            ip: req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? null,
            user_agent: req.headers.get("user-agent"),
          },
        });
      } catch { /* audit non bloquant */ }
    }

    return new Response(JSON.stringify({ ignored: result.reason }), {
      status,
      headers: JSON_HEADERS,
    });
  }

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
