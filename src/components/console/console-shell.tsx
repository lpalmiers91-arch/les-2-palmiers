"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  LogOut,
  Menu,
  X,
  LayoutGrid,
  CalendarDays,
  ConciergeBell,
  Users,
  MessageSquare,
  BookOpen,
  TrendingUp,
  CreditCard,
  ScrollText,
  Settings,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { Mark } from "@/components/brand/mark";
import { createClient } from "@/lib/supabase/client";

type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean };

const NAVS: Record<"staff" | "admin", NavItem[]> = {
  staff: [
    { href: "/staff", label: "Tableau de bord", icon: LayoutGrid, exact: true },
    { href: "/staff/reservations", label: "Réservations", icon: CalendarDays },
    { href: "/staff/demandes", label: "Demandes", icon: ConciergeBell },
    { href: "/staff/clients", label: "Clients", icon: Users },
    { href: "/staff/messages", label: "Messagerie", icon: MessageSquare },
    { href: "/staff/catalogue", label: "Catalogue", icon: BookOpen },
  ],
  admin: [
    { href: "/admin", label: "Tableau de bord", icon: LayoutGrid, exact: true },
    { href: "/admin/statistiques", label: "Statistiques", icon: TrendingUp },
    { href: "/admin/equipe", label: "Équipe & accès", icon: Users },
    { href: "/admin/paiements", label: "Paiements", icon: CreditCard },
    { href: "/admin/audit", label: "Journal d'audit", icon: ScrollText },
    { href: "/admin/assistant", label: "Assistant IA", icon: Sparkles },
    { href: "/admin/parametres", label: "Paramètres", icon: Settings },
  ],
};

const LABEL: Record<"staff" | "admin", string> = {
  staff: "Espace staff",
  admin: "Administration",
};

export function ConsoleShell({
  children,
  variant,
  userName,
}: {
  children: React.ReactNode;
  variant: "staff" | "admin";
  userName: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const nav = NAVS[variant];

  const active = (n: NavItem) =>
    n.exact ? pathname === n.href : pathname === n.href || pathname.startsWith(n.href + "/");

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/");
    router.refresh();
  }

  const Rail = (
    <>
      <Link href="/" className="flex items-center gap-2.5 px-3 text-ink">
        <Mark className="h-7 w-7" tone="ink" />
        <span className="display text-[1rem]">Les 2 Palmiers</span>
      </Link>
      <p className="mt-1 px-3 text-[11px] uppercase tracking-[0.16em] text-ink-3">{LABEL[variant]}</p>
      <nav className="mt-6 flex flex-1 flex-col gap-0.5">
        {nav.map((n) => {
          const Icon = n.icon;
          const on = active(n);
          return (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13.5px] transition-colors ${
                on ? "bg-forest text-bone" : "text-ink-2 hover:bg-ink/5"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.7} />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-line pt-3">
        <div className="px-3 pb-1.5 text-[12px] text-ink-3">{userName}</div>
        <button
          onClick={signOut}
          className="press flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] text-ink-2 hover:bg-ink/5"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.7} /> Se déconnecter
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-dvh bg-bone-2 lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-bone px-3 py-5 lg:flex">
        {Rail}
      </aside>

      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-bone/90 px-4 py-3 backdrop-blur-lg lg:hidden">
        <span className="display text-[0.98rem] text-ink">{LABEL[variant]}</span>
        <button onClick={() => setOpen(true)} aria-label="Ouvrir le menu" className="press p-1 text-ink">
          <Menu className="h-6 w-6" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-72 flex-col bg-bone px-3 py-5">
            <button onClick={() => setOpen(false)} aria-label="Fermer le menu" className="press mb-2 self-end p-1">
              <X className="h-5 w-5" />
            </button>
            {Rail}
          </div>
        </div>
      )}

      <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-9">{children}</main>
    </div>
  );
}
