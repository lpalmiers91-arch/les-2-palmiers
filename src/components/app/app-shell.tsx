"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LayoutGrid,
  CalendarDays,
  ConciergeBell,
  MessageSquare,
  UserRound,
  ShieldCheck,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { Mark } from "@/components/brand/mark";
import { createClient } from "@/lib/supabase/client";
import { PresenceProvider } from "@/lib/presence";
import { NotificationBell } from "./notification-bell";

const nav = [
  { href: "/app", label: "Aperçu", icon: LayoutGrid, exact: true },
  { href: "/app/reservations", label: "Réservations", icon: CalendarDays },
  { href: "/app/services", label: "Services", icon: ConciergeBell },
  { href: "/app/messages", label: "Messagerie", icon: MessageSquare },
  { href: "/app/compte", label: "Compte", icon: UserRound },
];

type Notif = Parameters<typeof NotificationBell>[0]["initial"][number];

export function AppShell({
  children,
  userName,
  userId,
  notifications,
  unreadMessages = 0,
  avatarUrl = null,
  identityStatus = "none",
}: {
  children: React.ReactNode;
  userName: string;
  userId: string;
  notifications: Notif[];
  unreadMessages?: number;
  avatarUrl?: string | null;
  identityStatus?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const showVerify = identityStatus !== "approved";

  const active = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  const NavList = ({ onNav }: { onNav?: () => void }) => (
    <nav className="flex flex-col gap-0.5">
      {nav.map((n) => {
        const Icon = n.icon;
        const on = active(n.href, n.exact);
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={onNav}
            className={`flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13.5px] transition-colors ${
              on ? "bg-forest text-bone" : "text-ink-2 hover:bg-ink/5"
            }`}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
            <span className="flex-1">{n.label}</span>
            {n.href === "/app/messages" && unreadMessages > 0 && (
              <span className="tnum rounded-full bg-brass px-1.5 text-[11px] font-semibold text-ink">
                {unreadMessages}
              </span>
            )}
          </Link>
        );
      })}
      {showVerify && (
        <Link
          href="/app/verification"
          onClick={onNav}
          className={`flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13.5px] transition-colors ${
            active("/app/verification")
              ? "bg-forest text-bone"
              : "text-brass-2 hover:bg-ink/5"
          }`}
        >
          <ShieldCheck className="h-[18px] w-[18px]" strokeWidth={1.7} />
          <span className="flex-1">Vérifier mon identité</span>
        </Link>
      )}
    </nav>
  );

  return (
    <div className="min-h-dvh bg-bone-2 lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-bone px-3 py-5 lg:flex">
        <div className="flex items-center justify-between px-1">
          <Link href="/" className="flex items-center gap-2.5 px-2 text-ink">
            <Mark className="h-7 w-7" tone="ink" />
            <span className="display text-[1.02rem]">Les 2 Palmiers</span>
          </Link>
          <NotificationBell userId={userId} initial={notifications} align="left" />
        </div>
        <div className="mt-7 flex-1">
          <NavList onNav={() => setOpen(false)} />
        </div>
        <div className="border-t border-line pt-3">
          <div className="flex items-center gap-2 px-3 pb-2">
            <Avatar url={avatarUrl} name={userName} />
            <span className="truncate text-[12px] text-ink-3">{userName}</span>
          </div>
          <button
            onClick={signOut}
            className="press flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13.5px] text-ink-2 hover:bg-ink/5"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.7} />
            Se déconnecter
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-bone/90 px-4 py-3 backdrop-blur-lg lg:hidden">
        <Link href="/app" className="flex items-center gap-2 text-ink">
          <Mark className="h-6 w-6" tone="ink" />
          <span className="display text-[0.98rem]">Les 2 Palmiers</span>
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell userId={userId} initial={notifications} align="right" />
          <button onClick={() => setOpen(true)} aria-label="Menu" className="press p-1 text-ink">
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-72 bg-bone p-5">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Avatar url={avatarUrl} name={userName} />
                <span className="display truncate text-[1rem] text-ink">{userName}</span>
              </span>
              <button onClick={() => setOpen(false)} aria-label="Fermer" className="press p-1">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-6">
              <NavList onNav={() => setOpen(false)} />
            </div>
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

      <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-10">
        <PresenceProvider userId={userId} role="client">
          {children}
        </PresenceProvider>
      </main>
    </div>
  );
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  return (
    <span className="relative flex h-7 w-7 shrink-0 overflow-hidden rounded-full bg-bone-2 ring-1 ring-line">
      {url ? (
        <Image src={url} alt="" fill sizes="28px" className="object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-[11px] font-medium text-ink-3">
          {name.slice(0, 2).toUpperCase()}
        </span>
      )}
    </span>
  );
}
