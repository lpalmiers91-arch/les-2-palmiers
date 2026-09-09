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
  UserCog,
  Activity,
  type LucideIcon,
} from "lucide-react";
import { Mark } from "@/components/brand/mark";
import { createClient } from "@/lib/supabase/client";
import { PresenceProvider } from "@/lib/presence";
import { NotificationBell } from "@/components/app/notification-bell";
import { useT } from "@/lib/i18n/provider";

type NavItem = { href: string; key: string; icon: LucideIcon; exact?: boolean };
type Notif = Parameters<typeof NotificationBell>[0]["initial"][number];

type NavGroup = { groupKey?: string; items: NavItem[] };

const NAVS: Record<"staff" | "admin", NavGroup[]> = {
  staff: [
    {
      items: [
        { href: "/staff", key: "dashboard", icon: LayoutGrid, exact: true },
        { href: "/staff/reservations", key: "reservations", icon: CalendarDays },
        { href: "/staff/demandes", key: "requests", icon: ConciergeBell },
        { href: "/staff/paiements", key: "payments", icon: CreditCard },
        { href: "/staff/verifications", key: "verifications", icon: ShieldCheck },
        { href: "/staff/messages", key: "messages", icon: MessageSquare },
        { href: "/staff/clients", key: "clients", icon: Users },
      ],
    },
    {
      groupKey: "configuration",
      items: [
        { href: "/staff/appartements", key: "apartments", icon: Building2 },
        { href: "/staff/catalogue", key: "catalog", icon: BookOpen },
        { href: "/staff/sejour", key: "stayInfo", icon: Wifi },
        { href: "/staff/avis", key: "reviews", icon: Star },
        { href: "/staff/fidelite", key: "loyalty", icon: Gift },
        { href: "/staff/contrats", key: "contracts", icon: FileSignature },
        { href: "/staff/site", key: "website", icon: LayoutTemplate },
        { href: "/staff/analytics", key: "analytics", icon: Activity },
        { href: "/staff/assistant", key: "aiAssistant", icon: Sparkles },
      ],
    },
  ],
  admin: [
    {
      groupKey: "supervision",
      items: [
        { href: "/admin", key: "dashboard", icon: LayoutGrid, exact: true },
        { href: "/admin/statistiques", key: "statistics", icon: TrendingUp },
        { href: "/admin/analytics", key: "analytics", icon: Activity },
        { href: "/admin/paiements", key: "payments", icon: CreditCard },
        { href: "/admin/verifications", key: "verifications", icon: ShieldCheck },
        { href: "/admin/audit", key: "auditLog", icon: ScrollText },
      ],
    },
    {
      groupKey: "steering",
      items: [
        { href: "/admin/equipe", key: "team", icon: Users },
        { href: "/admin/parametres", key: "settings", icon: Settings },
        { href: "/admin/assistant", key: "aiAssistant", icon: Sparkles },
      ],
    },
  ],
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
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const nav = NAVS[variant];
  const spaceLabel = variant === "admin" ? t("console.space.admin") : t("console.space.staff");

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
      <p className="mt-1 px-3 text-[11px] uppercase tracking-[0.16em] text-ink-3">{spaceLabel}</p>
      <nav className="mt-5 flex flex-1 flex-col gap-0.5 overflow-y-auto pb-2">
        {nav.map((group, gi) => (
          <div key={gi} className={gi > 0 ? "mt-4" : ""}>
            {group.groupKey && (
              <p className="mb-1 px-3 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ink-3/70">
                {t(`console.group.${group.groupKey}`)}
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
                  {t(`console.nav.${n.key}`)}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <div className="border-t border-line pt-3">
        <Link
          href={variant === "admin" ? "/admin/compte" : "/staff/compte"}
          onClick={() => setOpen(false)}
          className={`flex items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] transition-colors ${
            pathname.endsWith("/compte") ? "bg-forest text-bone" : "text-ink-2 hover:bg-ink/5"
          }`}
        >
          <UserCog className="h-4 w-4" strokeWidth={1.7} /> {t("console.nav.myAccount")}
        </Link>
        <button
          onClick={signOut}
          className="press mt-0.5 flex w-full items-center gap-2.5 rounded-[10px] px-3 py-2 text-[13px] text-ink-2 hover:bg-ink/5"
        >
          <LogOut className="h-4 w-4" strokeWidth={1.7} /> {t("console.action.signOut")}
        </button>
        <div className="px-3 pt-1.5 text-[11.5px] text-ink-3/80">{userName}</div>
      </div>
    </>
  );

  return (
    <div className="min-h-dvh bg-bone-2 lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-bone px-3 py-5 lg:flex">
        {Rail}
      </aside>

      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-line bg-bone/90 px-4 py-3 backdrop-blur-lg lg:hidden">
        <span className="display text-[0.98rem] text-ink">{spaceLabel}</span>
        <div className="flex items-center gap-1">
          <NotificationBell userId={userId} initial={notifications} align="right" space={variant} />
          <button onClick={() => setOpen(true)} aria-label={t("console.action.openMenu")} className="press p-1 text-ink">
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 flex h-full w-72 flex-col bg-bone px-3 py-5">
            <button onClick={() => setOpen(false)} aria-label={t("console.action.closeMenu")} className="press mb-2 self-end p-1">
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
