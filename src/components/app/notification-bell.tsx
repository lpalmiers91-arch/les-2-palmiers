"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { easeOut } from "@/lib/motion";

type Notif = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: unknown;
  read_at: string | null;
  created_at: string;
};

type Space = "client" | "staff" | "admin";

function href(n: Notif, space: Space): string {
  const d = (n.data ?? {}) as Record<string, unknown>;
  if (space === "client") {
    if (d.conversation_id) return "/app/messages";
    if (d.reservation_id) return "/app/reservations";
    return "/app/notifications";
  }
  // équipe (staff / admin)
  if (d.conversation_id) return `/staff/messages/${d.conversation_id}`;
  if (d.verification_id || n.type === "identity") return "/staff/verifications";
  if (d.contract_id || n.type === "contract") return "/staff/reservations";
  if (d.reservation_id) return "/staff/reservations";
  if (d.service_order_id) return "/staff/demandes";
  return space === "admin" ? "/admin" : "/staff";
}

function rel(iso: string): string {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "à l'instant";
  if (s < 3600) return `il y a ${Math.floor(s / 60)} min`;
  if (s < 86400) return `il y a ${Math.floor(s / 3600)} h`;
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function NotificationBell({
  userId,
  initial,
  align = "right",
  space = "client",
}: {
  userId: string;
  initial: Notif[];
  align?: "left" | "right";
  space?: Space;
}) {
  const router = useRouter();
  const [items, setItems] = useState<Notif[]>(initial);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = items.filter((n) => !n.read_at).length;

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase.channel(`notif-bell-${userId}-${Math.random().toString(36).slice(2)}`);
    ch.on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
      (payload) => {
        const n = payload.new as Notif;
        setItems((prev) => (prev.some((x) => x.id === n.id) ? prev : [n, ...prev].slice(0, 20)));
      },
    ).subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next && unread > 0) {
      const ids = items.filter((n) => !n.read_at).map((n) => n.id);
      setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })));
      await createClient()
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .in("id", ids);
      router.refresh();
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        aria-label={`Notifications${unread ? ` (${unread} non lues)` : ""}`}
        className="press relative flex h-9 w-9 items-center justify-center rounded-full text-ink-2 hover:bg-ink/5"
      >
        <Bell className="h-[18px] w-[18px]" strokeWidth={1.7} />
        {unread > 0 && (
          <span className="tnum absolute -right-0.5 -top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-brass px-1 text-[10px] font-semibold text-ink">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.18, ease: easeOut }}
            style={{ transformOrigin: align === "right" ? "top right" : "top left" }}
            className={`absolute top-11 z-50 w-[300px] overflow-hidden rounded-[var(--radius-lg)] border border-line bg-bone shadow-[0_24px_60px_-20px_rgba(23,19,13,0.35)] ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="text-[13px] font-medium text-ink">Notifications</span>
              {space === "client" && (
                <Link
                  href="/app/notifications"
                  onClick={() => setOpen(false)}
                  className="text-[11.5px] text-ink-3 hover:text-ink"
                >
                  Tout voir
                </Link>
              )}
            </div>
            <div className="max-h-[360px] overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-[13px] text-ink-3">Rien pour le moment.</p>
              ) : (
                <ul className="divide-y divide-line-soft">
                  {items.slice(0, 12).map((n) => (
                    <li key={n.id}>
                      <Link
                        href={href(n, space)}
                        onClick={() => setOpen(false)}
                        className="block px-4 py-3 transition-colors hover:bg-ink/[0.025]"
                      >
                        <p className="text-[13px] font-medium text-ink">{n.title}</p>
                        {n.body && <p className="mt-0.5 line-clamp-2 text-[12px] text-ink-2">{n.body}</p>}
                        <p className="mt-1 text-[10.5px] text-ink-3">{rel(n.created_at)}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
