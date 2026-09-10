"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, X } from "lucide-react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { ensureRealtimeAuth } from "@/lib/supabase/realtime";
import { useT } from "@/lib/i18n/provider";

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
    if (d.charge_id || n.type === "charge") return "/app/reservations";
    if (d.reservation_id) return "/app/reservations";
    if (d.verification_id || n.type === "identity") return "/app/verification";
    return "/app/notifications";
  }
  if (d.conversation_id) return `/staff/messages/${d.conversation_id}`;
  if (d.contact_id || n.type === "contact") return "/staff/contact";
  if (d.verification_id || n.type === "identity") return "/staff/verifications";
  if (d.contract_id || n.type === "contract") return "/staff/reservations";
  if (d.reservation_id || d.charge_id) return "/staff/reservations";
  if (d.service_order_id) return "/staff/demandes";
  return space === "admin" ? "/admin" : "/staff";
}

function rel(iso: string, nowMs: number | null): string {
  if (nowMs === null) return "";
  const s = Math.round((nowMs - new Date(iso).getTime()) / 1000);
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
  const { t } = useT();
  const [items, setItems] = useState<Notif[]>(initial);
  const [open, setOpen] = useState(false);
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // fusion avec la liste serveur (rafraîchie par LiveRefresh)
  useEffect(() => {
    setItems((prev) => {
      const byId = new Map(prev.map((n) => [n.id, n]));
      for (const n of initial) byId.set(n.id, { ...byId.get(n.id), ...n });
      return [...byId.values()].sort((a, b) => (a.created_at < b.created_at ? 1 : -1)).slice(0, 25);
    });
  }, [initial]);

  useEffect(() => {
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const unread = items.filter((n) => !n.read_at).length;

  // temps réel : nouvelle notification
  useEffect(() => {
    let cancelled = false;
    let ch: RealtimeChannel | null = null;
    ensureRealtimeAuth().then((supabase) => {
      if (cancelled) return;
      ch = supabase
        .channel(`notif-bell-${userId}-${Math.random().toString(36).slice(2)}`)
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
          (payload) => {
            const n = payload.new as Notif;
            setItems((prev) => (prev.some((x) => x.id === n.id) ? prev : [n, ...prev].slice(0, 25)));
          },
        )
        .subscribe();
    });
    return () => {
      cancelled = true;
      if (ch) createClient().removeChannel(ch);
    };
  }, [userId]);

  // fermeture au clic extérieur (desktop) + touche Échap
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  async function markAllRead() {
    const ids = items.filter((n) => !n.read_at).map((n) => n.id);
    if (ids.length === 0) return;
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: new Date().toISOString() })));
    await createClient()
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .in("id", ids);
    router.refresh();
  }

  function toggle() {
    setOpen((v) => {
      const next = !v;
      if (next) void markAllRead();
      return next;
    });
  }

  const list = (
    <>
      {items.length === 0 ? (
        <p className="px-4 py-10 text-center text-[13px] text-ink-3">{t("notif.empty")}</p>
      ) : (
        <ul className="divide-y divide-line-soft">
          {items.slice(0, 15).map((n) => (
            <li key={n.id}>
              <Link
                href={href(n, space)}
                onClick={() => setOpen(false)}
                className="block px-4 py-3 transition-colors hover:bg-ink/[0.03]"
              >
                <div className="flex items-start gap-2">
                  {!n.read_at && (
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brass" aria-hidden />
                  )}
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-ink">{n.title}</p>
                    {n.body && (
                      <p className="mt-0.5 line-clamp-2 text-[12px] text-ink-2">{n.body}</p>
                    )}
                    <p className="mt-1 text-[10.5px] text-ink-3" suppressHydrationWarning>
                      {rel(n.created_at, nowMs)}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );

  return (
    <div className="relative" ref={wrapRef}>
      <button
        onClick={toggle}
        aria-label={`${t("notif.title")}${unread ? ` · ${unread}` : ""}`}
        aria-expanded={open}
        className="press relative flex h-10 w-10 items-center justify-center rounded-full text-ink-2 hover:bg-ink/5"
      >
        <Bell className="h-[19px] w-[19px]" strokeWidth={1.7} />
        {unread > 0 && (
          <span className="tnum absolute right-1 top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-brass px-1 text-[9.5px] font-bold text-bone ring-2 ring-bone">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {/* ---- Desktop : menu déroulant ancré ---- */}
      {open && (
        <div
          className={`absolute top-[calc(100%+8px)] z-[80] hidden w-[340px] overflow-hidden rounded-[var(--radius-lg)] border border-line bg-bone shadow-[0_24px_60px_-20px_rgba(23,19,13,0.4)] lg:block ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="text-[13px] font-medium text-ink">{t("notif.title")}</span>
            {space === "client" && (
              <Link
                href="/app/notifications"
                onClick={() => setOpen(false)}
                className="text-[11.5px] text-ink-3 hover:text-ink"
              >
                {t("notif.seeAll")}
              </Link>
            )}
          </div>
          <div className="max-h-[400px] overflow-y-auto">{list}</div>
        </div>
      )}

      {/* ---- Mobile : panneau plein écran via portail (au-dessus de tout) ---- */}
      {open &&
        mounted &&
        createPortal(
          <div className="fixed inset-0 z-[200] lg:hidden">
            <div
              className="absolute inset-0 bg-ink/45"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <div className="absolute inset-x-0 top-0 flex max-h-[85dvh] flex-col rounded-b-[var(--radius-lg)] border-b border-line bg-bone shadow-[0_24px_60px_-10px_rgba(23,19,13,0.5)]">
              <div className="flex items-center justify-between border-b border-line px-4 py-3">
                <span className="text-[14px] font-semibold text-ink">{t("notif.title")}</span>
                <button
                  onClick={() => setOpen(false)}
                  aria-label={t("appNav.close")}
                  className="press flex h-8 w-8 items-center justify-center rounded-full text-ink-2 hover:bg-ink/5"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain">{list}</div>
              {space === "client" && (
                <Link
                  href="/app/notifications"
                  onClick={() => setOpen(false)}
                  className="border-t border-line px-4 py-3 text-center text-[13px] font-medium text-ink-2 hover:bg-ink/5"
                >
                  {t("notif.seeAll")}
                </Link>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
