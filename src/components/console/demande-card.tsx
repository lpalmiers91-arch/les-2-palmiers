"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/app/ui";
import { formatDate, formatXOF } from "@/lib/format";
import { useT } from "@/lib/i18n/provider";

type Order = {
  id: string;
  reference: string;
  status: string;
  price: number | null;
  pricing_mode: string;
  scheduled_for: string | null;
  options: Record<string, unknown>;
  note: string | null;
  decline_reason: string | null;
  service_title: string;
  customer_name: string;
};

export function DemandeCard({ order, providers }: { order: Order; providers: { id: string; full_name: string }[] }) {
  const router = useRouter();
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const [price, setPrice] = useState(order.price ? String(order.price) : "");
  const [when, setWhen] = useState(order.scheduled_for ? order.scheduled_for.slice(0, 16) : "");
  const [reason, setReason] = useState("");
  const [provider, setProvider] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function patch(fields: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("service_orders")
      .update(fields as never)
      .eq("id", order.id);
    setBusy(false);
    if (error) setError(error.message);
    else router.refresh();
  }

  const opts = Object.entries(order.options).filter(([, v]) => v !== "" && v != null);

  return (
    <li className="rounded-[var(--radius-lg)] border border-line bg-bone p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="display text-[1.1rem] text-ink">{order.service_title}</p>
          <p className="text-[12.5px] text-ink-3">
            {order.customer_name} · {t("console.demandeCard.ref")} {order.reference}
            {order.scheduled_for ? ` · ${formatDate(order.scheduled_for)}` : ""}
          </p>
        </div>
        <StatusBadge status={order.status} />
      </div>

      {(opts.length > 0 || order.note) && (
        <dl className="mt-3 space-y-1 border-t border-line pt-3 text-[13px]">
          {opts.map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <dt className="text-ink-3">{k}</dt>
              <dd className="text-ink">{String(v)}</dd>
            </div>
          ))}
          {order.note && <p className="text-ink-2">« {order.note} »</p>}
        </dl>
      )}

      {order.decline_reason && (
        <p className="mt-2 text-[12.5px] text-danger">
          {t("console.demandeCard.declined")} : {order.decline_reason}
        </p>
      )}

      {/* actions selon le statut */}
      <div className="mt-4 border-t border-line pt-4">
        {order.status === "requested" && (
          <div className="space-y-3">
            {order.pricing_mode !== "fixed" && (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder={t("console.demandeCard.pricePlaceholder")}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="field tnum h-10 max-w-[160px]"
                />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                disabled={busy || (order.pricing_mode !== "fixed" && !price)}
                onClick={() => patch({ status: "accepted", price: order.pricing_mode === "fixed" ? order.price : Number(price) })}
                className="press h-10 rounded-full bg-forest px-4 text-[13px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
              >
                {t("console.demandeCard.accept")}
                {order.pricing_mode !== "fixed" && price ? ` · ${formatXOF(Number(price))}` : ""}
              </button>
              <input
                placeholder={t("console.demandeCard.declineReason")}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="field h-10 max-w-[200px] text-[13px]"
              />
              <button
                disabled={busy || !reason}
                onClick={() => patch({ status: "declined", decline_reason: reason })}
                className="press h-10 rounded-full border border-line px-4 text-[13px] text-ink-2 hover:border-danger/40 disabled:opacity-50"
              >
                {t("console.demandeCard.decline")}
              </button>
            </div>
          </div>
        )}

        {order.status === "accepted" && (
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className="field h-10 max-w-[220px] text-[13px]"
            />
            {providers.length > 0 && (
              <select value={provider} onChange={(e) => setProvider(e.target.value)} className="field h-10 max-w-[180px] text-[13px]">
                <option value="">{t("console.demandeCard.providerPlaceholder")}</option>
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
              </select>
            )}
            <button
              disabled={busy || !when}
              onClick={() =>
                patch({
                  status: "scheduled",
                  scheduled_for: new Date(when).toISOString(),
                  assigned_provider_id: provider || null,
                })
              }
              className="press h-10 rounded-full bg-forest px-4 text-[13px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
            >
              {t("console.demandeCard.schedule")}
            </button>
          </div>
        )}

        {order.status === "scheduled" && (
          <button
            disabled={busy}
            onClick={() => patch({ status: "in_progress" })}
            className="press h-10 rounded-full bg-forest px-4 text-[13px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
          >
            {t("console.demandeCard.start")}
          </button>
        )}

        {order.status === "in_progress" && (
          <button
            disabled={busy}
            onClick={() => patch({ status: "completed" })}
            className="press h-10 rounded-full bg-forest px-4 text-[13px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
          >
            {t("console.demandeCard.markDone")}
          </button>
        )}

        {["completed", "declined", "cancelled"].includes(order.status) && (
          <p className="text-[12.5px] text-ink-3">{t("console.demandeCard.noAction")}</p>
        )}

        {!["completed", "declined", "cancelled"].includes(order.status) && (
          <button
            onClick={() => {
              if (confirm(t("console.demandeCard.cancelConfirm"))) patch({ status: "cancelled" });
            }}
            disabled={busy}
            className="press mt-3 flex h-9 items-center gap-1.5 rounded-full px-3 text-[12px] text-ink-3 hover:text-danger disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" /> {t("console.demandeCard.cancelRequest")}
          </button>
        )}

        {busy && <Loader2 className="mt-2 inline h-4 w-4 animate-spin text-ink-3" />}
        {error && <p className="mt-2 text-[12px] text-danger">{error}</p>}
      </div>
    </li>
  );
}
