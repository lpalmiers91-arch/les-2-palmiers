import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageTitle, Card } from "@/components/app/ui";
import { getT } from "@/lib/i18n";
import { RoleToggles } from "@/components/console/role-toggles";
import { InviteForm } from "@/components/console/invite-form";

export const metadata: Metadata = { title: "Équipe & accès" };

export default async function EquipePage() {
  const { t } = await getT();
  const supabase = await createClient();

  const [{ data: profiles }, { data: userRoles }, { data: rolePerms }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, phone").order("created_at"),
    supabase.from("user_roles").select("user_id, role_id"),
    supabase.from("role_permissions").select("role_id, permission_key"),
  ]);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const rolesByUser = new Map<string, string[]>();
  for (const ur of userRoles ?? []) {
    rolesByUser.set(ur.user_id, [...(rolesByUser.get(ur.user_id) ?? []), ur.role_id]);
  }

  const permsByRole = new Map<string, string[]>();
  for (const rp of rolePerms ?? []) {
    permsByRole.set(rp.role_id, [...(permsByRole.get(rp.role_id) ?? []), rp.permission_key]);
  }

  const team = (profiles ?? []).filter((p) =>
    (rolesByUser.get(p.id) ?? []).some((r) => ["staff", "coordinator", "admin"].includes(r)),
  );
  const clients = (profiles ?? []).filter((p) => !team.includes(p));

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle title={t("console.title.equipe")} sub={t("console.sub.equipe")} />

      <div className="mb-8">
        <InviteForm />
      </div>

      <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
        {t("console.team.members")}
      </h2>
      <ul className="space-y-2">
        {team.map((p) => (
          <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-line bg-bone px-4 py-3">
            <div>
              <p className="text-[14px] text-ink">
                {p.full_name || t("console.catEditor.untitled")}
                {p.id === user?.id && (
                  <span className="ml-2 text-[11px] text-ink-3">({t("console.team.you")})</span>
                )}
              </p>
              <p className="text-[12px] text-ink-3">{p.phone || "—"}</p>
            </div>
            <RoleToggles userId={p.id} roles={rolesByUser.get(p.id) ?? []} />
          </li>
        ))}
      </ul>

      <details className="mt-5">
        <summary className="cursor-pointer text-[13px] font-medium text-ink-2">
          {t("console.team.assignRole")} ({clients.length})
        </summary>
        <ul className="mt-3 space-y-2">
          {clients.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-line bg-bone px-4 py-3">
              <p className="text-[14px] text-ink">{p.full_name || t("console.catEditor.untitled")}</p>
              <RoleToggles userId={p.id} roles={rolesByUser.get(p.id) ?? []} />
            </li>
          ))}
        </ul>
      </details>

      <h2 className="mb-3 mt-9 text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">
        {t("console.team.permsByRole")}
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {["staff", "coordinator", "admin"].map((role) => (
          <Card key={role}>
            <p className="display text-[1.05rem] capitalize text-ink">{role}</p>
            <p className="mt-2 text-[12.5px] leading-relaxed text-ink-3">
              {(permsByRole.get(role) ?? []).sort().join(" · ")}
            </p>
          </Card>
        ))}
      </div>
    </div>
  );
}
