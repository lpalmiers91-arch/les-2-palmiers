// Adaptateurs PSP — interface commune. Chaque adaptateur sait :
//  - créer une session de paiement -> URL de redirection
//  - vérifier un webhook -> { ref, status }
// Les clés secrètes viennent des secrets Supabase (Deno.env).

export type CheckoutInput = {
  internalRef: string;
  amount: number; // en XOF (unité entière)
  currency: string;
  description: string;
  customerEmail: string | null;
  customerName: string | null;
  returnUrl: string; // page à afficher après paiement
  mode: "test" | "live";
};

export type WebhookResult =
  | { ok: true; ref: string; status: "paid" | "failed"; providerRef: string; raw: unknown }
  | { ok: false; reason: string };

// -------------------------------------------------------------------- FedaPay
export const fedapay = {
  async checkout(i: CheckoutInput): Promise<{ url: string } | { error: string }> {
    const key = Deno.env.get("FEDAPAY_SECRET_KEY");
    if (!key) return { error: "missing_secret" };
    const base = i.mode === "live" ? "https://api.fedapay.com" : "https://sandbox-api.fedapay.com";
    const res = await fetch(`${base}/v1/transactions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        description: i.description,
        amount: i.amount,
        currency: { iso: i.currency },
        callback_url: i.returnUrl,
        customer: i.customerEmail
          ? { email: i.customerEmail, firstname: i.customerName ?? "Client" }
          : undefined,
        metadata: { internal_ref: i.internalRef },
      }),
    });
    if (!res.ok) return { error: `fedapay_${res.status}` };
    const j = await res.json();
    const id = j?.["v1/transaction"]?.id ?? j?.id;
    // génère le token de paiement
    const tk = await fetch(`${base}/v1/transactions/${id}/token`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
    });
    const tj = await tk.json();
    const url = tj?.url;
    return url ? { url } : { error: "fedapay_no_url" };
  },
  async webhook(req: Request): Promise<WebhookResult> {
    const raw = await req.json().catch(() => null);
    if (!raw) return { ok: false, reason: "bad_body" };
    const entity = raw?.entity ?? raw?.["v1/transaction"] ?? raw;
    const ref = entity?.metadata?.internal_ref ?? raw?.metadata?.internal_ref;
    const st = String(entity?.status ?? "");
    if (!ref) return { ok: false, reason: "no_ref" };
    const status = st === "approved" || st === "transferred" ? "paid" : st === "canceled" || st === "declined" ? "failed" : null;
    if (!status) return { ok: false, reason: `ignored_${st}` };
    return { ok: true, ref, status, providerRef: String(entity?.id ?? ""), raw };
  },
};

// -------------------------------------------------------------------- KkiaPay
export const kkiapay = {
  async checkout(i: CheckoutInput): Promise<{ url: string } | { error: string }> {
    // KkiaPay est un widget côté client : on renvoie une URL de page hébergée
    // qui ouvre le widget avec la clé publique. Ici on signale au client de
    // basculer sur le widget (pas de redirection serveur possible sans compte).
    return { error: "client_widget" };
  },
  async webhook(req: Request): Promise<WebhookResult> {
    const secret = Deno.env.get("KKIAPAY_WEBHOOK_SECRET");
    const sig = req.headers.get("x-kkiapay-secret");
    if (secret && sig !== secret) return { ok: false, reason: "bad_signature" };
    const raw = await req.json().catch(() => null);
    if (!raw) return { ok: false, reason: "bad_body" };
    const ref = raw?.state?.internal_ref ?? raw?.internal_ref ?? raw?.data?.state?.internal_ref;
    const ok = raw?.isPaymentSucces ?? raw?.status === "SUCCESS";
    if (!ref) return { ok: false, reason: "no_ref" };
    return { ok: true, ref, status: ok ? "paid" : "failed", providerRef: String(raw?.transactionId ?? ""), raw };
  },
};

// -------------------------------------------------------------------- Stripe
export const stripe = {
  async checkout(i: CheckoutInput): Promise<{ url: string } | { error: string }> {
    const key = Deno.env.get("STRIPE_SECRET_KEY");
    if (!key) return { error: "missing_secret" };
    const form = new URLSearchParams();
    form.set("mode", "payment");
    form.set("success_url", i.returnUrl);
    form.set("cancel_url", i.returnUrl);
    form.set("client_reference_id", i.internalRef);
    form.set("metadata[internal_ref]", i.internalRef);
    if (i.customerEmail) form.set("customer_email", i.customerEmail);
    form.set("line_items[0][quantity]", "1");
    form.set("line_items[0][price_data][currency]", i.currency.toLowerCase());
    form.set("line_items[0][price_data][unit_amount]", String(i.amount)); // XOF : zéro décimale
    form.set("line_items[0][price_data][product_data][name]", i.description);
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: form,
    });
    if (!res.ok) return { error: `stripe_${res.status}` };
    const j = await res.json();
    return j?.url ? { url: j.url } : { error: "stripe_no_url" };
  },
  async webhook(req: Request): Promise<WebhookResult> {
    // vérification de signature Stripe (HMAC SHA-256)
    const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const sig = req.headers.get("stripe-signature") ?? "";
    const body = await req.text();
    if (secret) {
      const ok = await verifyStripeSig(body, sig, secret);
      if (!ok) return { ok: false, reason: "bad_signature" };
    }
    const evt = JSON.parse(body);
    if (evt.type !== "checkout.session.completed") return { ok: false, reason: `ignored_${evt.type}` };
    const s = evt.data.object;
    const ref = s.metadata?.internal_ref ?? s.client_reference_id;
    if (!ref) return { ok: false, reason: "no_ref" };
    const paid = s.payment_status === "paid";
    return { ok: true, ref, status: paid ? "paid" : "failed", providerRef: String(s.payment_intent ?? s.id), raw: evt };
  },
};

async function verifyStripeSig(payload: string, header: string, secret: string): Promise<boolean> {
  try {
    const parts = Object.fromEntries(header.split(",").map((p) => p.split("=")));
    const signed = `${parts.t}.${payload}`;
    const enc = new TextEncoder();
    const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const mac = await crypto.subtle.sign("HMAC", k, enc.encode(signed));
    const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, "0")).join("");
    return hex === parts.v1;
  } catch {
    return false;
  }
}

export function adapterFor(provider: string) {
  return provider === "fedapay" ? fedapay : provider === "kkiapay" ? kkiapay : provider === "stripe" ? stripe : null;
}
