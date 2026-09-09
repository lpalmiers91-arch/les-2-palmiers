"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/provider";

export function PageTitle({
  title,
  sub,
  action,
}: {
  title: string;
  sub?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="display text-[1.7rem] text-ink sm:text-[2rem]">{title}</h1>
        {sub && <p className="mt-1 text-[14px] text-ink-3">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Card({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "li";
}) {
  return (
    <Tag className={`rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6 ${className}`}>
      {children}
    </Tag>
  );
}

const statusTone: Record<string, string> = {
  pending_payment: "bg-warn/12 text-warn",
  confirmed: "bg-ok/12 text-forest-2",
  in_stay: "bg-ok/12 text-forest-2",
  completed: "bg-ink/8 text-ink-3",
  cancelled: "bg-danger/12 text-danger",
  no_show: "bg-danger/12 text-danger",
  requested: "bg-warn/12 text-warn",
  accepted: "bg-ok/12 text-forest-2",
  scheduled: "bg-ok/12 text-forest-2",
  in_progress: "bg-ok/12 text-forest-2",
  declined: "bg-danger/12 text-danger",
  draft: "bg-ink/8 text-ink-3",
  paid: "bg-ok/12 text-forest-2",
  failed: "bg-danger/12 text-danger",
  pending: "bg-warn/12 text-warn",
  awaiting_review: "bg-warn/12 text-warn",
  rejected: "bg-danger/12 text-danger",
  refunded: "bg-ink/8 text-ink-3",
  published: "bg-ok/12 text-forest-2",
  hidden: "bg-ink/8 text-ink-3",
};

export function StatusBadge({ status }: { status: string }) {
  const { t } = useT();
  const label = t(`console.status.${status}`);
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11.5px] font-medium ${statusTone[status] ?? "bg-ink/8 text-ink-3"}`}
    >
      {label === `console.status.${status}` ? status : label}
    </span>
  );
}

export function EmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta?: { href: string; label: string };
}) {
  return (
    <div className="rounded-[var(--radius-lg)] border border-dashed border-line bg-bone/60 px-6 py-14 text-center">
      <p className="display text-[1.15rem] text-ink">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-[14px] text-ink-3">{body}</p>
      {cta && (
        <Link
          href={cta.href}
          className="press mt-5 inline-flex h-10 items-center rounded-full bg-ink px-5 text-[13px] font-medium text-bone hover:bg-forest-2"
        >
          {cta.label}
        </Link>
      )}
    </div>
  );
}
