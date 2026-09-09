import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageTitle, EmptyState } from "@/components/app/ui";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Journal d'audit" };

const actionLabel: Record<string, string> = {
  insert: "Création",
  update: "Modification",
  delete: "Suppression",
};

export default async function AuditPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("audit_log")
    .select("id, actor_role, action, entity, entity_id, before, after, at")
    .order("at", { ascending: false })
    .limit(120);

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle title="Journal d'audit" sub="Historique des actions sur les données sensibles. Non modifiable." />
      {!rows || rows.length === 0 ? (
        <EmptyState title="Journal vide" body="Les actions tracées apparaîtront ici." />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-lg)] border border-line bg-bone text-[13px]">
          {rows.map((r) => (
            <li key={r.id} className="px-5 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-ink">
                  <span className="font-medium">{actionLabel[r.action] ?? r.action}</span> ·{" "}
                  <span className="text-ink-2">{r.entity}</span>
                  {r.entity_id && <span className="text-ink-3"> #{String(r.entity_id).slice(0, 8)}</span>}
                </span>
                <span className="text-[11.5px] text-ink-3">
                  {r.actor_role ?? "système"} ·{" "}
                  {formatDate(r.at, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              {r.action === "update" && (
                <Diff before={r.before as Record<string, unknown>} after={r.after as Record<string, unknown>} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Diff({ before, after }: { before: Record<string, unknown>; after: Record<string, unknown> }) {
  if (!before || !after) return null;
  const changed = Object.keys(after).filter(
    (k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]) && !["updated_at"].includes(k),
  );
  if (changed.length === 0) return null;
  return (
    <p className="mt-1 text-[11.5px] text-ink-3">
      {changed.map((k) => (
        <span key={k} className="mr-3">
          {k} : <span className="line-through">{short(before[k])}</span> → {short(after[k])}
        </span>
      ))}
    </p>
  );
}

function short(v: unknown) {
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  return s.length > 24 ? s.slice(0, 24) + "…" : s;
}
