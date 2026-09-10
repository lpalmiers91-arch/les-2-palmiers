"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Pencil, Trash2, Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";

export type PaymentAccount = {
  id: string;
  kind: string;
  label: string;
  value: string;
  holder: string | null;
  instructions: string | null;
  active: boolean;
};

const KINDS = ["momo", "flooz", "celtis", "bank", "card", "crypto", "other"] as const;
const KIND_LABEL: Record<string, string> = {
  momo: "MTN MoMo",
  flooz: "Moov Flooz",
  celtis: "Celtiis Cash",
  bank: "Virement bancaire",
  card: "Carte bancaire",
  crypto: "Cryptomonnaie",
  other: "Autre",
};

export function PaymentAccountsManager({ initial }: { initial: PaymentAccount[] }) {
  const { t } = useT();
  const router = useRouter();
  const [rows] = useState(initial);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
            {t("console.payAccounts.title")}
          </h2>
          <p className="mt-1 text-[12.5px] text-ink-3">{t("console.payAccounts.help")}</p>
        </div>
        {!adding && (
          <button
            onClick={() => {
              setAdding(true);
              setEditing(null);
            }}
            className="press inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[12.5px] font-medium text-ink-2 hover:border-ink/30"
          >
            <Plus className="h-3.5 w-3.5" /> {t("console.payAccounts.add")}
          </button>
        )}
      </div>

      {adding && (
        <AccountForm
          onDone={() => {
            setAdding(false);
            router.refresh();
          }}
          onCancel={() => setAdding(false)}
        />
      )}

      {rows.length === 0 && !adding ? (
        <p className="mt-3 text-[13px] text-ink-3">{t("console.payAccounts.empty")}</p>
      ) : (
        <ul className="mt-3 divide-y divide-line-soft">
          {rows.map((a) =>
            editing === a.id ? (
              <li key={a.id} className="py-2">
                <AccountForm
                  account={a}
                  onDone={() => {
                    setEditing(null);
                    router.refresh();
                  }}
                  onCancel={() => setEditing(null)}
                />
              </li>
            ) : (
              <li key={a.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="text-[13.5px] font-medium text-ink">
                    {a.label}
                    {!a.active && (
                      <span className="ml-2 rounded-full bg-ink/8 px-2 py-0.5 text-[10.5px] font-medium text-ink-3">
                        {t("console.payAccounts.inactive")}
                      </span>
                    )}
                  </p>
                  <p className="tnum text-[12.5px] text-ink-2">{a.value}</p>
                  <p className="text-[11.5px] text-ink-3">
                    {KIND_LABEL[a.kind] ?? a.kind}
                    {a.holder ? ` · ${a.holder}` : ""}
                    {a.instructions ? ` · ${a.instructions}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => {
                      setEditing(a.id);
                      setAdding(false);
                    }}
                    className="press p-1.5 text-ink-3 hover:text-ink"
                    aria-label={t("console.payAccounts.edit")}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <DeleteBtn id={a.id} onDone={() => router.refresh()} t={t} />
                </div>
              </li>
            ),
          )}
        </ul>
      )}
    </div>
  );
}

function DeleteBtn({
  id,
  onDone,
  t,
}: {
  id: string;
  onDone: () => void;
  t: (k: string) => string;
}) {
  const [busy, setBusy] = useState(false);
  async function del() {
    if (!window.confirm(t("console.payAccounts.confirmDelete"))) return;
    setBusy(true);
    await createClient().rpc("staff_delete_payment_account", { p_id: id });
    setBusy(false);
    onDone();
  }
  return (
    <button onClick={del} disabled={busy} className="press p-1.5 text-ink-3 hover:text-danger" aria-label={t("console.payAccounts.delete")}>
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
    </button>
  );
}

function AccountForm({
  account,
  onDone,
  onCancel,
}: {
  account?: PaymentAccount;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { t } = useT();
  const [kind, setKind] = useState(account?.kind ?? "momo");
  const [label, setLabel] = useState(account?.label ?? "");
  const [value, setValue] = useState(account?.value ?? "");
  const [holder, setHolder] = useState(account?.holder ?? "");
  const [instructions, setInstructions] = useState(account?.instructions ?? "");
  const [active, setActive] = useState(account?.active ?? true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function save() {
    if (!label.trim()) return setErr(t("console.payAccounts.labelRequired"));
    if (!value.trim()) return setErr(t("console.payAccounts.valueRequired"));
    setBusy(true);
    setErr(null);
    try {
      const { error } = await createClient().rpc("staff_upsert_payment_account", {
        p_id: account?.id ?? (null as unknown as string),
        p_kind: kind,
        p_label: label.trim(),
        p_value: value.trim(),
        p_holder: holder.trim() || undefined,
        p_instructions: instructions.trim() || undefined,
        p_active: active,
      });
      if (error) throw error;
      onDone();
    } catch {
      setErr(t("console.payAccounts.err"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 rounded-[12px] border border-line bg-bone-2/50 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">{t("console.payAccounts.kind")}</span>
          <select className="field" value={kind} onChange={(e) => setKind(e.target.value)}>
            {KINDS.map((k) => (
              <option key={k} value={k}>
                {KIND_LABEL[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">{t("console.payAccounts.label")}</span>
          <input className="field" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={t("console.payAccounts.labelPlaceholder")} />
        </label>
      </div>
      <label className="mt-3 block">
        <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">{t("console.payAccounts.value")}</span>
        <input className="field tnum" value={value} onChange={(e) => setValue(e.target.value)} placeholder={t("console.payAccounts.valuePlaceholder")} />
      </label>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">
            {t("console.payAccounts.holder")} <span className="text-ink-3">({t("console.charges.optional")})</span>
          </span>
          <input className="field" value={holder} onChange={(e) => setHolder(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-medium text-ink-2">
            {t("console.payAccounts.instructions")} <span className="text-ink-3">({t("console.charges.optional")})</span>
          </span>
          <input className="field" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
        </label>
      </div>
      <label className="mt-3 flex items-center gap-2 text-[12.5px] font-medium text-ink-2">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="h-4 w-4 accent-forest" />
        {t("console.payAccounts.activeLabel")}
      </label>

      {err && <p className="mt-2 text-[12px] text-danger">{err}</p>}

      <div className="mt-3 flex gap-2">
        <button
          onClick={save}
          disabled={busy}
          className="press inline-flex h-10 items-center gap-2 rounded-full bg-ink px-5 text-[13px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {t("console.payAccounts.save")}
        </button>
        <button
          onClick={onCancel}
          className="press inline-flex h-10 items-center gap-1.5 rounded-full border border-line px-4 text-[13px] text-ink-2 hover:border-ink/30"
        >
          <X className="h-3.5 w-3.5" /> {t("console.payAccounts.cancel")}
        </button>
      </div>
    </div>
  );
}
