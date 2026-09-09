"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Marque l'utilisateur comme "vu récemment" toutes les 60 s tant que l'onglet
 * est visible. Sert de repli quand la présence temps réel n'est pas disponible.
 */
export function useHeartbeat() {
  useEffect(() => {
    const supabase = createClient();
    let stopped = false;
    const ping = () => {
      if (document.visibilityState === "visible" && !stopped) {
        supabase.rpc("heartbeat").then(() => {}, () => {});
      }
    };
    ping();
    const id = window.setInterval(ping, 60_000);
    document.addEventListener("visibilitychange", ping);
    return () => {
      stopped = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", ping);
    };
  }, []);
}

type PresenceMeta = { user_id: string; name: string; role: "client" | "staff" };

/**
 * Présence temps réel sur un canal partagé : renvoie l'ensemble des user_id
 * actuellement connectés. `self` est publié dans le canal.
 */
export function usePresence(channel: string, self: PresenceMeta | null) {
  const [online, setOnline] = useState<Set<string>>(new Set());
  const selfRef = useRef(self);
  selfRef.current = self;

  useEffect(() => {
    if (!self) return;
    const supabase = createClient();
    const ch = supabase.channel(channel, {
      config: { presence: { key: self.user_id } },
    });

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState<PresenceMeta>();
      setOnline(new Set(Object.keys(state)));
    });

    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        ch.track(selfRef.current as PresenceMeta);
      }
    });

    return () => {
      ch.untrack();
      supabase.removeChannel(ch);
    };
    // on ne recrée le canal que si le nom change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, self?.user_id]);

  return online;
}

/** "en ligne" si vu il y a moins de 3 minutes. */
export function isRecentlyOnline(lastSeenAt: string | null | undefined): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 3 * 60_000;
}
