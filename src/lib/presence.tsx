"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { ensureRealtimeAuth } from "@/lib/supabase/realtime";

type Role = "client" | "staff";
type Meta = { user_id: string; role: Role };

type PresenceState = {
  /** user_id -> rôles présents */
  peers: Map<string, Set<Role>>;
};

const Ctx = createContext<PresenceState>({ peers: new Map() });

/**
 * UN SEUL abonnement au canal `presence:support` pour toute l'app.
 * Monté une fois par AppShell / ConsoleShell. Les composants lisent via useOnline*.
 */
export function PresenceProvider({
  userId,
  role,
  children,
}: {
  userId: string;
  role: Role;
  children: ReactNode;
}) {
  const [peers, setPeers] = useState<Map<string, Set<Role>>>(new Map());
  const metaRef = useRef<Meta>({ user_id: userId, role });
  metaRef.current = { user_id: userId, role };

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    let ch: RealtimeChannel | null = null;

    ensureRealtimeAuth().then((supabase) => {
      if (cancelled) return;
      ch = supabase.channel("presence:support", { config: { presence: { key: userId } } });
      ch.on("presence", { event: "sync" }, () => {
        const state = ch!.presenceState<Meta>();
        const map = new Map<string, Set<Role>>();
        for (const [key, metas] of Object.entries(state)) {
          const roles = new Set<Role>();
          for (const m of metas as Meta[]) if (m.role) roles.add(m.role);
          map.set(key, roles);
        }
        setPeers(map);
      });
      ch.subscribe((status) => {
        if (status === "SUBSCRIBED") ch!.track(metaRef.current);
      });
    });

    // battement de présence (last_seen_at) tant que l'onglet est visible
    const ping = () => {
      if (document.visibilityState === "visible") {
        createClient().rpc("heartbeat").then(
          () => {},
          () => {},
        );
      }
    };
    ping();
    const hb = window.setInterval(ping, 60_000);
    document.addEventListener("visibilitychange", ping);

    return () => {
      cancelled = true;
      window.clearInterval(hb);
      document.removeEventListener("visibilitychange", ping);
      if (ch) {
        ch.untrack();
        createClient().removeChannel(ch);
      }
    };
  }, [userId]);

  return <Ctx.Provider value={{ peers }}>{children}</Ctx.Provider>;
}

/** Un membre d'un rôle donné est-il en ligne ? (n'importe lequel, ou un id précis) */
export function useIsOnline() {
  const { peers } = useContext(Ctx);
  return useCallback(
    (role: Role, userId?: string | null) => {
      if (userId) return peers.get(userId)?.has(role) ?? false;
      for (const roles of peers.values()) if (roles.has(role)) return true;
      return false;
    },
    [peers],
  );
}

/** "vu récemment" = il y a moins de 3 minutes (repli quand la présence live manque). */
export function isRecentlyOnline(lastSeenAt: string | null | undefined): boolean {
  if (!lastSeenAt) return false;
  return Date.now() - new Date(lastSeenAt).getTime() < 3 * 60_000;
}
