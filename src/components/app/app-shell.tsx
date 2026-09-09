"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  CalendarDays,
  ConciergeBell,
  MessageSquare,
  Bell,
  UserRound,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Mark } from "@/components/brand/mark";
import { createClient } from "@/lib/supabase/client";

const nav = [
  { href: "/app", label: "Aperçu", icon: CalendarDays, exact: true },
  { href: "/app/reservations", label: "Réservations", icon: CalendarDays },
  { href: "/app/services", label: "Services", icon: ConciergeBell },
  { href: "/app/messages", label: "Messages", icon: MessageSquare },
  { href: "/app/notifications", label: "Notifications", icon: Bell },
  { href: "/app/compte", label: "Compte", icon: UserRound },
];

export function AppShell({
  children,
  userName,
  unread = 0,
}: {
  children: React.ReactNode;
  userName: string;
  unread?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const active = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-dvh bg-bone-2 lg:grid lg:grid-cols-[248px_1fr]">
      {/* rail latéral (desktop) */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-bone px-3 py-5 lg:flex">
        <Link href="/" className="flex items-center gap-2.5 px-3 text-ink">
          <Mark className="h-7 w-7" tone="ink" />
          <span className="display text-[1.02rem]">Les 2 Palmiers</span>
        </Link>
        <nav className="mt-7 flex flex-1 flex-col gap-0.5">
          {nav.map((n) => (
            <NavLink key={n.href} {...n} active={active(n.href, n.exact)} badge={n.href === "/app/messages" ? unread : 0} />
          ))}
        </nav>
        <div className="border-t border-line pt-3">
          <div className="px-3 pb-2 text-[12px] text-ink-3">{userName}</div>
          <button
            onClick={signOut}
            className="press flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13.5px] text-ink-2 hover:bg-ink/5"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.7} />
            Se déconnecter
          </button>
        </div>
      </aside>

      {/* barre mobile */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-bone/90 px-4 py-3 backdrop-blur-lg lg:hidden">
        <Link href="/app" className="flex items-center gap-2 text-ink">
          <Mark className="h-6 w-6" tone="ink" />
          <span className="display text-[0.98rem]">Les 2 Palmiers</span>
        </Link>
        <button onClick={() => setOpen(true)} aria-label="Menu" className="press p-1 text-ink">
          <Menu className="h-6 w-6" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-72 bg-bone p-5">
            <div className="flex items-center justify-between">
              <span className="display text-[1rem] text-ink">{userName}</span>
              <button onClick={() => setOpen(false)} aria-label="Fermer" className="press p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="mt-6 flex flex-col gap-0.5">
              {nav.map((n) => (
                <NavLink
                  key={n.href}
                  {...n}
                  active={active(n.href, n.exact)}
                  badge={n.href === "/app/messages" ? unread : 0}
                  onClick={() => setOpen(false)}
                />
              ))}
            </nav>
            <button
              onClick={signOut}
              className="press mt-4 flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2.5 text-[14px] text-ink-2 hover:bg-ink/5"
            >
              <LogOut className="h-4 w-4" />
              Se déconnecter
            </button>
          </div>
        </div>
      )}

      <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-10">{children}</main>
    </div>
  );
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  badge = 0,
  onClick,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  active: boolean;
  badge?: number;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className={`flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13.5px] transition-colors ${
        active ? "bg-forest text-bone" : "text-ink-2 hover:bg-ink/5"
      }`}
    >
      <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
      <span className="flex-1">{label}</span>
      {badge > 0 && (
        <span className="tnum rounded-full bg-brass px-1.5 text-[11px] font-semibold text-ink">
          {badge}
        </span>
      )}
    </Link>
  );
}
