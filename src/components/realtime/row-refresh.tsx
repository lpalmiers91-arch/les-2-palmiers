"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { ensureRealtimeAuth } from "@/lib/supabase/realtime";

/**
 * Rafraîchit les Server Components quand une ligne précise change
 * (ex. un contrat édité par le staff apparaît aussitôt chez le client).
 * Sans jamais recharger la page. Filet de sécurité par polling.
 */
export function RowRefresh({
  table,
  column = "id",
  value,
}: {
  table: string;
  column?: string;
  value: string;
}) {
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!value) return;
    let cancelled = false;
    let channel: RealtimeChannel | null = null;

    const bump = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 350);
    };

    ensureRealtimeAuth().then((supabase) => {
      if (cancelled) return;
      const ch = supabase
        .channel(`row-${table}-${value}-${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table, filter: `${column}=eq.${value}` },
          bump,
        );
      ch.subscribe();
      channel = ch;
    });

    const onVisible = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    const poll = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 15_000);

    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
      window.clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisible);
      if (channel) createClient().removeChannel(channel);
    };
  }, [table, column, value, router]);

  return null;
}
