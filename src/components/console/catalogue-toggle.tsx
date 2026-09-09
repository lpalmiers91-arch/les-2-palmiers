"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function CatalogueToggle({ id, active }: { id: string; active: boolean }) {
  const router = useRouter();
  const [on, setOn] = useState(active);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    setBusy(true);
    const next = !on;
    setOn(next);
    const { error } = await createClient().from("services").update({ active: next }).eq("id", id);
    setBusy(false);
    if (error) setOn(!next);
    else router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      role="switch"
      aria-checked={on}
      aria-label={on ? "Désactiver" : "Activer"}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${
        on ? "bg-forest" : "bg-bone-3"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-bone shadow transition-transform ${
          on ? "translate-x-[22px]" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
