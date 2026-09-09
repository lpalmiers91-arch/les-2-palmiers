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
  Building2,
  ShieldCheck,
  TrendingUp,
  CreditCard,
  ScrollText,
  Settings,
  Sparkles,
  Star,
  Gift,
  LayoutTemplate,
  Wifi,
  FileSignature,
  type LucideIcon,
} from "lucide-react";
import { Mark } from "@/components/brand/mark";
import { createClient } from "@/lib/supabase/client";
import { PresenceProvider } from "@/lib/presence";
import { NotificationBell } from "@/components/app/notification-bell";

type NavItem = { href: string; label: string; icon: LucideIcon; exact?: boolean };
type Notif = Parameters<typeof NotificationBell>[0]["initial"][number];

type NavGroup = { label?: string; items: NavItem[] };

const NAVS: Record<"staff" | "admin", NavGroup[]> = {
  staff: [
    {
      items: [
        { href: "/staff", label: "Tableau de bord", icon: LayoutGrid, exact: true },
        { href: "/staff/reservations", label: "Réservations", icon: CalendarDays },
        { href: "/staff/demandes", label: "Demandes", icon: ConciergeBell },
        { href: "/staff/paiements", label: "Paiements", icon: CreditCard },
        { href: "/staff/verifications", label: "Vérifications", icon: ShieldCheck },
        { href: "/staff/messages", label: "Messagerie", icon: MessageSquare },
        { href: "/staff/clients", label: "Clients", icon: Users },
      ],
    },
    {
      label: "Configuration",
      items: [
        { href: "/staff/appartements", label: "Appartements", icon: Building2 },
        { href: "/staff/catalogue", label: "Catalogue", icon: BookOpen },
        { href: "/staff/sejour", label: "Infos séjour", icon: Wifi },
        { href: "/staff/avis", label: "Avis clients", icon: Star },
        { href: "/staff/fidelite", label: "Fidélité", icon: Gift },
        { href: "/staff/contrats", label: "Contrats", icon: FileSignature },
        { href: "/staff/site", label: "Site web", icon: LayoutTemplate },
        { href: "/staff/assistant", label: "Assistant IA", icon: Sparkles },
      ],
    },
  ],
  admin: [
    {
      label: "Supervision",
      items: [
        { href: "/admin", label: "Tableau de bord", icon: LayoutGrid, exact: true },
        { href: "/admin/statistiques", label: "Statistiques", icon: TrendingUp },
        { href: "/admin/paiements", label: "Paiements", icon: CreditCard },
        { href: "/admin/verifications", label: "Vérifications", icon: ShieldCheck },
        { href: "/admin/audit", label: "Journal d'audit", icon: ScrollText },
      ],
    },
    {
      label: "Pilotage",
      items: [
        { href: "/admin/equipe", label: "Équipe & accès", icon: Users },
        { href: "/admin/parametres", label: "Paramètres", icon: Settings },
        { href: "/admin/assistant", label: "Assistant IA", icon: Sparkles },
      ],
    },
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
  userId,
  notifications = [],
}: {
  children: React.ReactNode;
  variant: "staff" | "admin";
  userName: string;
  userId: string;
  notifications?: Notif[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const nav = NAVS[variant];

  const active = (n: NavItem) =>
    n.exact ? pathname === n.href : pathname === n.href || pathname.startsWith(n.href + "/");

  async function signOut() {
    await createClient().auth.signOut();
    router.push("/equipe");
    router.refresh();
  }

  const Rail = (
    <>
      <div className="flex items-center justify-between px-1">
        <Link href={variant === "admin" ? "/admin" : "/staff"} className="flex items-center gap-2.5 px-2 text-ink">
          <Mark className="h-7 w-7" tone="ink" />
          <span className="display text-[1rem]">Les 2 Palmiers</span>
        </Link>
        <NotificationBell userId={userId} initial={notifications} align="right" space={variant} />
      </div>
      <p className="mt-1 px-3 text-[11px] uppercase tracking-[0.16em] text-ink-3">{LABEL[variant]}</p>
      <nav className="mt-5 flex flex-1 flex-col gap-0.5 overflow-y-auto pb-2">
        {nav.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-4" : ""}>
            {group.label && (
              <p className="mb-1 px-3 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-3/70">
                {group.label}
              </p>
            )}
            {group.items.map((n) => {
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
          </div>
        ))}
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
        <div className="flex items-center gap-1">
          <NotificationBell userId={userId} initial={notifications} align="right" space={variant} />
          <button onClick={() => setOpen(true)} aria-label="Ouvrir le menu" className="press p-1 text-ink">
            <Menu className="h-6 w-6" />
          </button>
        </div>
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

      <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-9">
        <PresenceProvider userId={userId} role="staff">
          {children}
        </PresenceProvider>
      </main>
    </div>
  );
}
