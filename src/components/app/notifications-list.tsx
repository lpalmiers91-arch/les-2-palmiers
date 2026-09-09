"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n/provider";

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  created_at: string;
  read_at: string | null;
};

export function NotificationsList({ initial }: { initial: Notif[] }) {
  const router = useRouter();
  const { t } = useT();
  const [rows, setRows] = useState<Notif[]>(initial);

  async function remove(id: string) {
    setRows((r) => r.filter((n) => n.id !== id));
    await createClient().rpc("delete_notification", { p_id: id });
    router.refresh();
  }

  async function clearAll() {
    if (!confirm(t("notifPrefs.clearConfirm"))) return;
    setRows([]);
    await createClient().rpc("clear_notifications");
    router.refresh();
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-dashed border-line bg-bone/60 px-6 py-14 text-center">
        <p className="display text-[1.15rem] text-ink">{t("notifPrefs.emptyT")}</p>
        <p className="mx-auto mt-2 max-w-sm text-[14px] text-ink-3">{t("notifPrefs.emptyB")}</p>
      </div>
    );
  }

  return (
    <>
      <div className="mb-3 flex justify-end">
        <button
          onClick={clearAll}
          className="press flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-[12px] font-medium text-ink-2 hover:border-danger/40 hover:text-danger"
        >
          <Trash2 className="h-3 w-3" /> {t("notifPrefs.clearAll")}
        </button>
      </div>
      <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-bone">
        {rows.map((n) => (
          <li key={n.id} className="group flex gap-3.5 px-5 py-4">
            <span
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                n.read_at ? "bg-bone-2 text-ink-3" : "bg-forest text-bone"
              }`}
            >
              <Bell className="h-4 w-4" strokeWidth={1.7} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-medium text-ink">{n.title}</p>
              {n.body && <p className="mt-0.5 text-[13px] text-ink-2">{n.body}</p>}
              <p className="mt-1 text-[11.5px] text-ink-3">
                {formatDate(n.created_at, {
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <button
              onClick={() => remove(n.id)}
              aria-label={t("console.action.delete")}
              className="press -mr-1 -mt-1 self-start p-1 text-ink-3 opacity-0 transition-opacity hover:text-danger group-hover:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
