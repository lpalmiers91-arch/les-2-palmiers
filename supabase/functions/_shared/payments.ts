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

// -------------------------------------------------------------------- crypto
const te = new TextEncoder();

/** Comparaison à temps constant (anti-timing-attack). */
function timingSafeEqual(a: string, b: string): boolean {
  const ba = te.encode(a);
  const bb = te.encode(b);
  // longueur toujours comparée sur la même base pour ne pas divulguer la taille
  const len = Math.max(ba.length, bb.length, 1);
  let diff = ba.length ^ bb.length;
  for (let i = 0; i < len; i++) diff |= (ba[i] ?? 0) ^ (bb[i] ?? 0);
  return diff === 0;
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    te.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", key, te.encode(payload));
  return [...new Uint8Array(mac)].map((x) => x.toString(16).padStart(2, "0")).join("");
}

// CORRECTIF 2 : `returnUrl` doit toujours pointer vers notre propre origine.
// Le seul appelant actuel (payment-checkout) la construit lui-même depuis
// APP_URL (aucune entrée utilisateur), mais ces adaptateurs sont une
// frontière de confiance partagée : on valide ici, pas seulement chez
// l'appelant, pour que toute future évolution ne puisse pas ouvrir un
// redirect externe via un PSP. Échec explicite (pas de repli silencieux).
function validateReturnUrl(url: string, allowedOrigin: string): string {
  let parsed: URL;
  let allowed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("invalid_return_url");
  }
  try {
    allowed = new URL(allowedOrigin);
  } catch {
    throw new Error("invalid_allowed_origin");
  }
  if (parsed.origin !== allowed.origin) {
    throw new Error("return_url_origin_mismatch");
  }
  return url;
}

/** Vérifie une signature type Stripe / FedaPay : header `t=<ts>,s=<hex>` ou `t=<ts>,v1=<hex>`. */
async function verifyTimestampedHmac(
  body: string,
  header: string,
  secret: string,
  maxAgeSec = 300,
): Promise<boolean> {
  try {
    const parts: Record<string, string> = {};
    for (const seg of header.split(",")) {
      const i = seg.indexOf("=");
      if (i > 0) parts[seg.slice(0, i).trim()] = seg.slice(i + 1).trim();
    }
    const ts = parts.t;
    const sig = parts.s ?? parts.v1 ?? parts.sha256;
    if (!ts || !sig) return false;
    // anti-rejeu
    const age = Math.abs(Date.now() / 1000 - Number(ts));
    if (!Number.isFinite(age) || age > maxAgeSec) return false;
    const expected = await hmacSha256Hex(secret, `${ts}.${body}`);
    return timingSafeEqual(sig, expected);
  } catch {
    return false;
  }
}

// -------------------------------------------------------------------- FedaPay
export const fedapay = {
  async checkout(i: CheckoutInput): Promise<{ url: string } | { error: string }> {
    const key = Deno.env.get("FEDAPAY_SECRET_KEY");
    if (!key) return { error: "missing_secret" };
    let returnUrl: string;
    try {
      returnUrl = validateReturnUrl(i.returnUrl, Deno.env.get("APP_URL") ?? "https://les2palmiers.site");
    } catch (e) {
      return { error: e instanceof Error ? e.message : "invalid_return_url" };
    }
    const base = i.mode === "live" ? "https://api.fedapay.com" : "https://sandbox-api.fedapay.com";
    const res = await fetch(`${base}/v1/transactions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        description: i.description,
        amount: i.amount,
        currency: { iso: i.currency },
        callback_url: returnUrl,
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
    // VULN-02 : vérification de signature obligatoire (fail-closed).
    const secret = Deno.env.get("FEDAPAY_WEBHOOK_SECRET");
    if (!secret) return { ok: false, reason: "missing_secret_config" };
    const body = await req.text();
    const sigHeader = req.headers.get("x-fedapay-signature") ?? req.headers.get("X-FEDAPAY-SIGNATURE") ?? "";
    if (!(await verifyTimestampedHmac(body, sigHeader, secret))) {
      return { ok: false, reason: "bad_signature" };
    }
    const raw = ((): unknown => {
      try {
        return JSON.parse(body);
      } catch {
        return null;
      }
    })() as Record<string, unknown> | null;
    if (!raw) return { ok: false, reason: "bad_body" };
    const entity = (raw as Record<string, unknown>).entity ??
      (raw as Record<string, unknown>)["v1/transaction"] ?? raw;
    const e = entity as Record<string, unknown>;
    const ref = (e?.metadata as Record<string, unknown>)?.internal_ref ??
      ((raw as Record<string, unknown>).metadata as Record<string, unknown>)?.internal_ref;
    const st = String(e?.status ?? "");
    if (!ref) return { ok: false, reason: "no_ref" };
    const status = st === "approved" || st === "transferred"
      ? "paid"
      : st === "canceled" || st === "declined"
      ? "failed"
      : null;
    if (!status) return { ok: false, reason: `ignored_${st}` };
    return { ok: true, ref: String(ref), status, providerRef: String(e?.id ?? ""), raw };
  },
};

// -------------------------------------------------------------------- KkiaPay
export const kkiapay = {
  async checkout(i: CheckoutInput): Promise<{ url: string } | { error: string }> {
    // KkiaPay est un widget côté client : on renvoie une URL de page hébergée
    // qui ouvre le widget avec la clé publique. Ici on signale au client de
    // basculer sur le widget (pas de redirection serveur possible sans compte).
    // Validée même si non utilisée aujourd'hui : ce garde-fou doit rester en
    // place si cet adaptateur gagne un jour une vraie redirection serveur.
    try {
      validateReturnUrl(i.returnUrl, Deno.env.get("APP_URL") ?? "https://les2palmiers.site");
    } catch (e) {
      return { error: e instanceof Error ? e.message : "invalid_return_url" };
    }
    return { error: "client_widget" };
  },
  async webhook(req: Request): Promise<WebhookResult> {
    // VULN-02 : plus de fail-open — secret obligatoire, comparaison à temps constant.
    const secret = Deno.env.get("KKIAPAY_WEBHOOK_SECRET");
    if (!secret) return { ok: false, reason: "missing_secret_config" };
    const sig = req.headers.get("x-kkiapay-secret") ?? "";
    if (!timingSafeEqual(sig, secret)) return { ok: false, reason: "bad_signature" };
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
    let returnUrl: string;
    try {
      returnUrl = validateReturnUrl(i.returnUrl, Deno.env.get("APP_URL") ?? "https://les2palmiers.site");
    } catch (e) {
      return { error: e instanceof Error ? e.message : "invalid_return_url" };
    }
    const form = new URLSearchParams();
    form.set("mode", "payment");
    form.set("success_url", returnUrl);
    form.set("cancel_url", returnUrl);
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
    // VULN-02 : signature Stripe obligatoire (fail-closed) + anti-rejeu 5 min.
    const secret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!secret) return { ok: false, reason: "missing_secret_config" };
    const sig = req.headers.get("stripe-signature") ?? "";
    const body = await req.text();
    if (!(await verifyTimestampedHmac(body, sig, secret))) {
      return { ok: false, reason: "bad_signature" };
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

export function adapterFor(provider: string) {
  return provider === "fedapay" ? fedapay : provider === "kkiapay" ? kkiapay : provider === "stripe" ? stripe : null;
}
