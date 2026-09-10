"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Gift, Loader2, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { FUNCTIONS_URL, SUPABASE_ANON_KEY } from "@/lib/supabase/config";
import { formatXOF } from "@/lib/format";
import { useT } from "@/lib/i18n/provider";

const AMOUNTS = [15000, 25000, 50000, 100000];
const METHODS = ["mtn", "moov", "celtis", "card"] as const;

export function GiftCardPanel() {
  const { t } = useT();
  const router = useRouter();
  const [tab, setTab] = useState<"buy" | "redeem">("buy");

  // buy
  const [amount, setAmount] = useState(25000);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [method, setMethod] = useState<(typeof METHODS)[number]>("card");
  const [payId, setPayId] = useState<string | null>(null);
  const [boughtCode, setBoughtCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // redeem
  const [code, setCode] = useState("");
  const [credited, setCredited] = useState<number | null>(null);

  async function startBuy() {
    setErr(null);
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setErr(t("giftCard.errEmail"));
    setBusy(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("create_gift_card", {
        p_amount: amount,
        p_recipient_email: email,
        p_recipient_name: name || undefined,
        p_message: msg || undefined,
        p_method: method,
      });
      if (error) throw error;
      const r = data as { code: string; payment_ref: string };
      setBoughtCode(r.code);

      const { data: pay } = await supabase
        .from("payments")
        .select("id")
        .eq("internal_ref", r.payment_ref)
        .single();
      setPayId(pay!.id);

      // vrai PSP ?
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch(`${FUNCTIONS_URL}/payment-checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ payment_ref: r.payment_ref }),
      });
      const j = await res.json();
      if (j?.mode === "redirect" && j.url) window.location.href = j.url as string;
    } catch {
      setErr(t("giftCard.errGeneric"));
    } finally {
      setBusy(false);
    }
  }

  async function resolveBuy(outcome: "success" | "failure") {
    if (!payId) return;
    setBusy(true);
    const { error } = await createClient().rpc("payment_resolve", { p_payment: payId, p_outcome: outcome });
    setBusy(false);
    if (!error && outcome === "success") {
      router.refresh();
    }
    if (outcome === "failure") {
      setPayId(null);
      setBoughtCode(null);
    } else {
      setPayId("done");
    }
  }

  async function redeem() {
    setErr(null);
    setBusy(true);
    const { data, error } = await createClient().rpc("redeem_gift_card", { p_code: code.trim() });
    setBusy(false);
    if (error) {
      setErr(
        /code_invalid/.test(error.message)
          ? t("giftCard.errCode")
          : /card_unusable|card_expired/.test(error.message)
            ? t("giftCard.errUnusable")
            : t("giftCard.errGeneric"),
      );
      return;
    }
    setCredited((data as { credited: number }).credited);
    setCode("");
    router.refresh();
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6">
      <div className="flex gap-1.5 rounded-full bg-bone-2 p-1 text-[12.5px] font-medium">
        <button
          onClick={() => setTab("buy")}
          className={`press flex-1 rounded-full py-2 ${tab === "buy" ? "bg-bone text-ink shadow-sm" : "text-ink-3"}`}
        >
          {t("giftCard.buyTab")}
        </button>
        <button
          onClick={() => setTab("redeem")}
          className={`press flex-1 rounded-full py-2 ${tab === "redeem" ? "bg-bone text-ink shadow-sm" : "text-ink-3"}`}
        >
          {t("giftCard.redeemTab")}
        </button>
      </div>

      {tab === "buy" && (
        <div className="mt-5">
          {payId === "done" ? (
            <div className="text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-forest text-bone">
                <Check className="h-6 w-6" />
              </span>
              <p className="mt-3 text-[15px] font-medium text-ink">{t("giftCard.bought")}</p>
              <p className="mt-1 text-[13px] text-ink-3">{t("giftCard.boughtBody", { email })}</p>
              {boughtCode && (
                <code className="mt-3 inline-block rounded-[10px] bg-bone-2 px-4 py-2 text-[15px] font-semibold tracking-[0.1em] text-ink">
                  {boughtCode}
                </code>
              )}
            </div>
          ) : payId ? (
            <div>
              <div className="rounded-[12px] border border-dashed border-brass/40 bg-brass/[0.05] p-4 text-[13px] text-ink-2">
                {t("giftCard.simNote", { amount: formatXOF(amount) })}
              </div>
              <div className="mt-4 grid gap-2.5">
                <button
                  onClick={() => resolveBuy("success")}
                  disabled={busy}
                  className="press flex h-11 items-center justify-center gap-2 rounded-full bg-forest text-[13.5px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {t("giftCard.confirmPay")}
                </button>
                <button
                  onClick={() => resolveBuy("failure")}
                  disabled={busy}
                  className="press flex h-10 items-center justify-center gap-1.5 rounded-full border border-line text-[13px] text-ink-2 hover:border-danger/40 disabled:opacity-50"
                >
                  <X className="h-3.5 w-3.5" /> {t("giftCard.cancel")}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{t("giftCard.amount")}</span>
                <div className="grid grid-cols-4 gap-2">
                  {AMOUNTS.map((a) => (
                    <button
                      key={a}
                      onClick={() => setAmount(a)}
                      className={`press rounded-[10px] border py-2 text-[12.5px] font-medium tnum transition-colors ${
                        amount === a ? "border-forest bg-forest/[0.05] text-ink" : "border-line text-ink-2"
                      }`}
                    >
                      {(a / 1000).toLocaleString("fr-FR")}k
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={5000}
                  max={1000000}
                  step={1000}
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value) || 0)}
                  className="field tnum mt-2"
                />
              </div>
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{t("giftCard.recipientEmail")}</span>
                <input type="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-ink-2">
                  {t("giftCard.recipientName")} <span className="text-ink-3">({t("giftCard.optional")})</span>
                </span>
                <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-ink-2">
                  {t("giftCard.message")} <span className="text-ink-3">({t("giftCard.optional")})</span>
                </span>
                <textarea className="field h-auto resize-y py-2" rows={2} value={msg} onChange={(e) => setMsg(e.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{t("giftCard.method")}</span>
                <select className="field" value={method} onChange={(e) => setMethod(e.target.value as (typeof METHODS)[number])}>
                  {METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>
              {err && <p className="text-[12.5px] text-danger">{err}</p>}
              <button
                onClick={startBuy}
                disabled={busy}
                className="press flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-[14px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                <Gift className="h-4 w-4" /> {t("giftCard.pay", { amount: formatXOF(amount) })}
              </button>
            </div>
          )}
        </div>
      )}

      {tab === "redeem" && (
        <div className="mt-5">
          {credited != null ? (
            <div className="rounded-[12px] border border-forest/25 bg-forest/[0.04] p-4">
              <p className="flex items-center gap-2 text-[14px] font-medium text-ink">
                <Check className="h-4 w-4 text-forest-2" /> {t("giftCard.redeemed", { amount: formatXOF(credited) })}
              </p>
              <p className="mt-1 text-[13px] text-ink-2">{t("giftCard.redeemedBody")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[13px] text-ink-3">{t("giftCard.redeemHelp")}</p>
              <input
                className="field text-center text-[15px] font-semibold tracking-[0.1em] uppercase"
                placeholder="GIFT-XXXX-XXXX"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
              {err && <p className="text-[12.5px] text-danger">{err}</p>}
              <button
                onClick={redeem}
                disabled={busy || code.trim().length < 6}
                className="press flex h-11 w-full items-center justify-center gap-2 rounded-full bg-ink text-[13px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("giftCard.redeemBtn")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
