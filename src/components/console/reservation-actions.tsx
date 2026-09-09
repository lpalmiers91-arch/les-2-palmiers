"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";

const transitions: Record<string, { to: string; key: string }[]> = {
  pending_payment: [{ to: "cancelled", key: "cancel" }],
  confirmed: [
    { to: "in_stay", key: "checkIn" },
    { to: "cancelled", key: "cancel" },
  ],
  in_stay: [{ to: "completed", key: "checkOut" }],
};

export function ReservationActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const { t } = useT();
  const [busy, setBusy] = useState(false);
  const actions = transitions[status] ?? [];
  if (actions.length === 0) return null;

  async function go(to: string) {
    setBusy(true);
    const patch: Record<string, unknown> = { status: to };
    if (to === "cancelled") {
      patch.cancellation = { by: "staff", at: new Date().toISOString() };
    }
    await createClient().from("reservations").update(patch as never).eq("id", id);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((a, i) => (
        <button
          key={a.to}
          disabled={busy}
          onClick={() => go(a.to)}
          className={`press h-9 rounded-full px-4 text-[12.5px] font-medium disabled:opacity-50 ${
            i === 0 && a.to !== "cancelled"
              ? "bg-forest text-bone hover:bg-forest-2"
              : "border border-line text-ink-2 hover:border-ink/30"
          }`}
        >
          {busy && i === 0 ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            t(`console.reservationActions.${a.key}`)
          )}
        </button>
      ))}
    </div>
  );
}
