"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, PenLine } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PrintButton } from "@/components/app/print-button";
import { Mark } from "@/components/brand/mark";
import { site } from "@/lib/site";
import { formatXOF, formatDate } from "@/lib/format";
import { useT } from "@/lib/i18n/provider";

type Clause = { title: string; body: string };
type Terms = {
  reservation_reference?: string;
  apartment?: string;
  address?: string;
  checkin?: string;
  checkout?: string;
  nights?: number;
  guests?: number;
  total_amount?: number;
  deposit_amount?: number;
  currency?: string;
  occupants?: string;
  arrival_time?: string;
  notes?: string;
  clauses?: Clause[];
};

type Contract = {
  id: string;
  reference: string;
  status: "draft" | "signed" | "countersigned" | "cancelled";
  terms: Terms;
  client_signature_name: string | null;
  client_signed_at: string | null;
  staff_signature_name: string | null;
  countersigned_at: string | null;
};

const DEFAULT_CLAUSES: [string, string][] = [
  ["Objet", "Le présent contrat encadre la location meublée de courte durée du logement désigné ci-dessous, à des fins d'hébergement temporaire, ainsi que les prestations de conciergerie éventuellement commandées."],
  ["Durée", "La location est consentie pour la période indiquée. Toute prolongation doit faire l'objet d'un accord écrit préalable et d'un complément de règlement."],
  ["Prix et règlement", "Le prix du séjour est celui figurant dans le récapitulatif. Un acompte est versé à la réservation ; le solde est réglé avant la remise des clés. Les prestations de services sont facturées séparément."],
  ["Dépôt de garantie", "Un dépôt de garantie peut être demandé à l'arrivée et restitué après état des lieux de sortie, déduction faite des éventuelles dégradations."],
  ["Occupation", "Le logement ne peut être occupé que par le nombre de personnes déclaré. La sous-location et l'organisation d'événements sont interdites sans autorisation écrite."],
  ["Règlement intérieur", "Le client s'engage à respecter le voisinage, à ne pas fumer à l'intérieur, et à restituer le logement dans son état de propreté initial. Les animaux sont admis sur accord préalable."],
  ["Annulation", "En cas d'annulation à plus de 7 jours de l'arrivée, l'acompte est remboursé. À moins de 7 jours, l'acompte reste acquis. Un départ anticipé ne donne lieu à aucun remboursement des nuits réservées."],
  ["Responsabilité", "Le client est responsable des dommages causés pendant le séjour. Le bailleur ne peut être tenu responsable en cas de force majeure ou d'interruption des réseaux indépendante de sa volonté."],
  ["Données personnelles", "Les informations recueillies sont traitées conformément à la politique de confidentialité et servent uniquement à la gestion du séjour."],
  ["Nature de la démonstration", "Cette plateforme est un environnement de démonstration : les paiements sont simulés et ce document n'emporte pas d'engagement contractuel réel."],
];

export function ContractPanel({
  contract: initial,
  client,
  canSign,
}: {
  contract: Contract;
  client: { name: string; address: string; phone: string };
  canSign: boolean;
}) {
  const router = useRouter();
  const { t: tr } = useT();
  const [contract, setContract] = useState(initial);
  const t = contract.terms || {};
  const clauses: [string, string][] =
    Array.isArray(t.clauses) && t.clauses.length > 0
      ? t.clauses.map((c) => [c.title || tr("contractPanel.clause"), c.body || ""])
      : DEFAULT_CLAUSES;

  const [occupants, setOccupants] = useState(t.occupants ?? client.name);
  const [arrival, setArrival] = useState(t.arrival_time ?? "");
  const [notes, setNotes] = useState(t.notes ?? "");
  const [accept, setAccept] = useState(false);
  const [signature, setSignature] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const signed = contract.status !== "draft";

  async function sign(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!accept) {
      setErr(tr("contractPanel.mustAccept"));
      return;
    }
    if (signature.trim().length < 3) {
      setErr(tr("contractPanel.signYourName"));
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await createClient().rpc("sign_contract", {
        p_contract: contract.id,
        p_signature_name: signature.trim(),
        p_fields: {
          occupants: occupants.trim(),
          arrival_time: arrival || null,
          notes: notes.trim() || null,
        },
      });
      if (error) throw error;
      setContract((c) => ({ ...c, ...(data as Contract) }));
      router.refresh();
    } catch {
      setErr(tr("contractPanel.errSign"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-dvh bg-bone-2 px-4 py-10 print:bg-white print:p-0">
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between print:hidden">
          <a
            href={canSign ? "/app/reservations" : "/staff/reservations"}
            className="text-[13px] text-ink-3 hover:text-ink"
          >
            ← {canSign ? tr("contractPanel.myReservations") : tr("contractPanel.reservations")}
          </a>
          {signed && <PrintButton />}
        </div>

        <article className="rounded-[var(--radius-lg)] border border-line bg-bone p-8 print:rounded-none print:border-0 print:p-6">
          <header className="flex items-start justify-between border-b border-ink/15 pb-5">
            <div className="flex items-center gap-2.5">
              <Mark className="h-9 w-9" tone="ink" />
              <div>
                <p className="display text-[1.1rem] text-ink">Les 2 Palmiers</p>
                <p className="text-[11px] text-ink-3">
                  {site.city}, {site.country}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[11px] uppercase tracking-[0.14em] text-ink-3">{tr("contractPanel.title")}</p>
              <p className="tnum text-[13px] font-medium text-ink">{contract.reference}</p>
            </div>
          </header>

          <section className="mt-5 grid gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2">
            <Row label={tr("contractPanel.landlord")}>{site.legalName}</Row>
            <Row label={tr("contractPanel.client")}>{client.name || "—"}</Row>
            <Row label={tr("contractPanel.dwelling")}>{t.apartment ?? "Appartement Les 2 Palmiers"}</Row>
            <Row label={tr("contractPanel.address")}>{t.address ?? tr("contractPanel.addressTbd")}</Row>
            <Row label={tr("contractPanel.checkin")}>{t.checkin ? formatDate(t.checkin) : "—"}</Row>
            <Row label={tr("contractPanel.checkout")}>{t.checkout ? formatDate(t.checkout) : "—"}</Row>
            <Row label={tr("contractPanel.nights")}>{t.nights ?? "—"}</Row>
            <Row label={tr("contractPanel.guests")}>{t.guests ?? "—"}</Row>
            <Row label={tr("contractPanel.total")}>
              {t.total_amount != null ? formatXOF(Number(t.total_amount)) : "—"}
            </Row>
            <Row label={tr("contractPanel.deposit")}>
              {t.deposit_amount != null ? formatXOF(Number(t.deposit_amount)) : "—"}
            </Row>
            <Row label={tr("contractPanel.reservation")}>{t.reservation_reference ?? "—"}</Row>
          </section>

          <section className="mt-6 border-t border-ink/15 pt-5">
            <ol className="space-y-3 text-[12.5px] leading-relaxed text-ink-2">
              {clauses.map(([title, body], i) => (
                <li key={title}>
                  <span className="font-medium text-ink">
                    {i + 1}. {title}.
                  </span>{" "}
                  {body}
                </li>
              ))}
            </ol>
          </section>

          {/* champs remplis par le client */}
          {!signed ? (
            <form onSubmit={sign} className="mt-6 border-t border-ink/15 pt-5 print:hidden">
              <h2 className="display text-[1.05rem] text-ink">{tr("contractPanel.fillAndSign")}</h2>
              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-medium text-ink-2">
                    {tr("contractPanel.occupants")}
                  </span>
                  <textarea
                    className="field min-h-[64px] resize-y"
                    value={occupants}
                    onChange={(e) => setOccupants(e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-medium text-ink-2">
                    {tr("contractPanel.arrivalTime")} <span className="text-ink-3">({tr("contractPanel.optional")})</span>
                  </span>
                  <input
                    type="time"
                    className="field"
                    value={arrival}
                    onChange={(e) => setArrival(e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-medium text-ink-2">
                    {tr("contractPanel.specialRequests")} <span className="text-ink-3">({tr("contractPanel.optional")})</span>
                  </span>
                  <textarea
                    className="field min-h-[64px] resize-y"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </label>

                <label className="flex items-start gap-2.5 text-[13px] text-ink-2">
                  <input
                    type="checkbox"
                    checked={accept}
                    onChange={(e) => setAccept(e.target.checked)}
                    className="mt-0.5 h-4 w-4"
                  />
                  <span>
                    {tr("contractPanel.acceptText")}
                  </span>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-[13px] font-medium text-ink-2">
                    {tr("contractPanel.signatureLabel")}
                  </span>
                  <input
                    className="field"
                    value={signature}
                    onChange={(e) => setSignature(e.target.value)}
                    placeholder={client.name || tr("contractPanel.namePlaceholder")}
                  />
                </label>
              </div>

              {err && <p className="mt-3 text-[13px] text-danger">{err}</p>}

              {canSign ? (
                <button
                  type="submit"
                  disabled={busy}
                  className="press mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-[14px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
                  {tr("contractPanel.signBtn")}
                </button>
              ) : (
                <p className="mt-4 text-[13px] text-ink-3">{tr("contractPanel.onlyHolder")}</p>
              )}
            </form>
          ) : (
            <section className="mt-6 border-t border-ink/15 pt-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <SignatureBlock
                  role={tr("contractPanel.theClient")}
                  name={contract.client_signature_name}
                  at={contract.client_signed_at}
                />
                <SignatureBlock
                  role="Les 2 Palmiers"
                  name={contract.staff_signature_name}
                  at={contract.countersigned_at}
                  pending={tr("contractPanel.awaitingCountersign")}
                />
              </div>
              {(t.occupants || t.arrival_time || t.notes) && (
                <div className="mt-5 space-y-1 text-[12.5px] text-ink-2">
                  {t.occupants && <p><span className="text-ink-3">{tr("contractPanel.occupantsShort")}</span> {t.occupants}</p>}
                  {t.arrival_time && (
                    <p><span className="text-ink-3">{tr("contractPanel.arrivalShort")}</span> {t.arrival_time}</p>
                  )}
                  {t.notes && <p><span className="text-ink-3">{tr("contractPanel.requestsShort")}</span> {t.notes}</p>}
                </div>
              )}
              <p className="mt-4 rounded-[10px] bg-ok/10 px-3 py-2 text-[13px] text-forest-2 print:hidden">
                <Check className="mr-1 inline h-3.5 w-3.5" />
                {tr("contractPanel.signedNote")}
              </p>
            </section>
          )}

          <footer className="mt-8 border-t border-ink/15 pt-4 text-[11px] leading-relaxed text-ink-3">
            {site.legalName} · {site.email} · {site.phones[0]}
            <br />
            {tr("contractPanel.demoFoot")}
          </footer>
        </article>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b border-line-soft py-1">
      <span className="text-ink-3">{label}</span>
      <span className="text-right text-ink">{children}</span>
    </div>
  );
}

function SignatureBlock({
  role,
  name,
  at,
  pending,
}: {
  role: string;
  name: string | null;
  at: string | null;
  pending?: string;
}) {
  return (
    <div className="rounded-[10px] border border-line-soft p-3">
      <p className="text-[11px] uppercase tracking-[0.12em] text-ink-3">{role}</p>
      {name ? (
        <>
          <p className="serif-em mt-1 text-[1.05rem] text-ink">{name}</p>
          <p className="text-[11px] text-ink-3">
            {at
              ? formatDate(at, { day: "numeric", month: "long", year: "numeric" })
              : ""}
          </p>
        </>
      ) : (
        <p className="mt-2 text-[12px] text-ink-3">{pending ?? "—"}</p>
      )}
    </div>
  );
}
