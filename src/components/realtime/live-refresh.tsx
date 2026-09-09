"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Watch = { table: string; filter?: string };

/**
 * Abonne la page aux changements Postgres pertinents et rafraîchit les Server
 * Components (router.refresh) — sans jamais recharger la page. Un seul canal,
 * tous les .on() ajoutés avant .subscribe().
 */
export function LiveRefresh({ space, userId }: { space: "client" | "staff" | "admin"; userId: string }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();

    const watches: Watch[] =
      space === "client"
        ? [
            { table: "notifications", filter: `user_id=eq.${userId}` },
            { table: "identity_verifications", filter: `user_id=eq.${userId}` },
            { table: "reservations", filter: `guest_id=eq.${userId}` },
            { table: "contracts", filter: `client_id=eq.${userId}` },
            { table: "service_orders", filter: `customer_id=eq.${userId}` },
            { table: "payments", filter: `payer_id=eq.${userId}` },
          ]
        : [
            // le staff voit tout ce que la RLS l'autorise à voir
            { table: "notifications", filter: `user_id=eq.${userId}` },
            { table: "conversations" },
            { table: "reservations" },
            { table: "service_orders" },
            { table: "identity_verifications" },
            { table: "contracts" },
            { table: "payments" },
          ];

    const bump = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 400);
    };

    let ch = supabase.channel(`live-${space}-${userId}-${Math.random().toString(36).slice(2)}`);
    for (const w of watches) {
      ch = ch.on(
        "postgres_changes",
        { event: "*", schema: "public", table: w.table, ...(w.filter ? { filter: w.filter } : {}) },
        bump,
      );
    }
    ch.subscribe();

    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVisible);
      supabase.removeChannel(ch);
    };
  }, [space, userId, router]);

  return null;
}
