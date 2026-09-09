import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { PageTitle, Card } from "@/components/app/ui";
import { getT } from "@/lib/i18n";

export const metadata: Metadata = { title: "Paramètres" };

export default async function ParametresPage() {
  const { t } = await getT();
  const supabase = await createClient();
  const { data: s } = await supabase.from("site_settings").select("*").eq("id", 1).maybeSingle();
  const company = (s?.company ?? {}) as Record<string, unknown>;

  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title={t("console.title.parametres")} sub={t("console.sub.parametres")} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">Entreprise</h2>
          <dl className="mt-3 space-y-2 text-[13.5px]">
            <Row k="Nom">{String(company.name ?? "—")}</Row>
            <Row k="Ville">{String(company.city ?? "—")}</Row>
            <Row k="E-mail">{String(company.email ?? "—")}</Row>
            <Row k="Domaine">{String(company.domain ?? "—")}</Row>
          </dl>
        </Card>
        <Card>
          <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">Téléphones</h2>
          <ul className="mt-3 space-y-1.5 text-[13.5px] tnum text-ink">
            {(Array.isArray(company.phones) ? (company.phones as string[]) : []).map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </Card>
      </div>

      <Card className="mt-4">
        <h2 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-ink-3">Pages légales</h2>
        <p className="mt-2 text-[13px] text-ink-3">
          CGV, politique de confidentialité, politique cookies et mentions légales
          sont éditables dans le module « Contenu ». Version de démonstration :
          textes par défaut.
        </p>
      </Card>
    </div>
  );
}

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-3">{k}</dt>
      <dd className="text-right text-ink">{children}</dd>
    </div>
  );
}
