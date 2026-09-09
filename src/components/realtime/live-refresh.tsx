"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { ensureRealtimeAuth } from "@/lib/supabase/realtime";

type Watch = { table: string; filter?: string };

/**
 * Abonne la page aux changements Postgres pertinents et rafraîchit les Server
 * Components (router.refresh) — sans jamais recharger la page.
 */
export function LiveRefresh({ space, userId }: { space: "client" | "staff" | "admin"; userId: string }) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    const watches: Watch[] =
      space === "client"
        ? [
            { table: "notifications", filter: `user_id=eq.${userId}` },
            { table: "identity_verifications", filter: `user_id=eq.${userId}` },
            { table: "reservations", filter: `guest_id=eq.${userId}` },
            { table: "contracts", filter: `client_id=eq.${userId}` },
            { table: "service_orders", filter: `customer_id=eq.${userId}` },
            { table: "payments", filter: `payer_id=eq.${userId}` },
            { table: "conversations", filter: `customer_id=eq.${userId}` },
          ]
        : [
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

    ensureRealtimeAuth().then((supabase) => {
      if (cancelled) return;
      let ch = supabase.channel(`live-${space}-${userId}-${Math.random().toString(36).slice(2)}`);
      for (const w of watches) {
        ch = ch.on(
          "postgres_changes",
          { event: "*", schema: "public", table: w.table, ...(w.filter ? { filter: w.filter } : {}) },
          bump,
        );
      }
      ch.subscribe();
      channel = ch;
    });

    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    // filet de sécurité si le temps réel décroche
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 20_000);

    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) createClient().removeChannel(channel);
    };
  }, [space, userId, router]);

  return null;
}
