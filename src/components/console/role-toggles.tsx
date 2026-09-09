"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";

const ALL = [
  { id: "client", key: "roleClient" },
  { id: "staff", key: "roleStaff" },
  { id: "coordinator", key: "roleCoordinator" },
  { id: "admin", key: "roleAdmin" },
];

export function RoleToggles({ userId, roles }: { userId: string; roles: string[] }) {
  const router = useRouter();
  const { t } = useT();
  const [current, setCurrent] = useState<string[]>(roles);
  const [busy, setBusy] = useState<string | null>(null);

  async function toggle(roleId: string) {
    const has = current.includes(roleId);
    setBusy(roleId);
    const supabase = createClient();
    if (has) {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role_id", roleId);
      setCurrent((c) => c.filter((r) => r !== roleId));
    } else {
      await supabase.from("user_roles").insert({ user_id: userId, role_id: roleId });
      setCurrent((c) => [...c, roleId]);
    }
    setBusy(null);
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {ALL.map((r) => {
        const on = current.includes(r.id);
        return (
          <button
            key={r.id}
            onClick={() => toggle(r.id)}
            disabled={busy === r.id}
            className={`press rounded-full border px-2.5 py-1 text-[11.5px] font-medium transition-colors disabled:opacity-50 ${
              on ? "border-forest bg-forest text-bone" : "border-line text-ink-3 hover:border-ink/30"
            }`}
          >
            {t(`console.invite.${r.key}`)}
          </button>
        );
      })}
    </div>
  );
}
