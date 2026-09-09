"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Plus, Trash2, PenLine } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { formatXOF, formatDate } from "@/lib/format";

type Clause = { title: string; body: string };
type Terms = Record<string, unknown> & { clauses?: Clause[] };

export function ContractEditor({
  contractId,
  reference,
  status,
  initialTerms,
  clientName,
  clientSignedAt,
  countersignedAt,
}: {
  contractId: string;
  reference: string;
  status: string;
  initialTerms: Terms;
  clientName: string;
  clientSignedAt: string | null;
  countersignedAt: string | null;
}) {
  const router = useRouter();
  const [terms, setTerms] = useState<Terms>(initialTerms);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [signName, setSignName] = useState("");
  const [signing, setSigning] = useState(false);

  const clauses: Clause[] = Array.isArray(terms.clauses) ? terms.clauses : [];

  function setField(k: string, v: unknown) {
    setTerms((t) => ({ ...t, [k]: v }));
  }
  function setClauses(next: Clause[]) {
    setTerms((t) => ({ ...t, clauses: next }));
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    const { error } = await createClient().rpc("staff_update_contract", {
      p_contract: contractId,
      p_terms: terms as never,
    });
    setSaving(false);
    if (!error) {
      setSaved(true);
      router.refresh();
      setTimeout(() => setSaved(false), 2500);
    }
  }

  async function countersign() {
    if (signName.trim().length < 3) return;
    setSigning(true);
    const { error } = await createClient().rpc("countersign_contract", {
      p_contract: contractId,
      p_signature_name: signName.trim(),
    });
    setSigning(false);
    if (!error) router.refresh();
  }

  const money = (k: string) =>
    terms[k] != null ? formatXOF(Number(terms[k])) : "—";

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      {/* éditeur */}
      <div className="space-y-5">
        <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6">
          <h2 className="display text-[1.15rem] text-ink">Informations</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <F label="Logement">
              <input
                className="field"
                value={String(terms.apartment ?? "")}
                onChange={(e) => setField("apartment", e.target.value)}
              />
            </F>
            <F label="Adresse">
              <input
                className="field"
                value={String(terms.address ?? "")}
                onChange={(e) => setField("address", e.target.value)}
              />
            </F>
            <F label="Arrivée">
              <input
                type="date"
                className="field"
                value={String(terms.checkin ?? "")}
                onChange={(e) => setField("checkin", e.target.value)}
              />
            </F>
            <F label="Départ">
              <input
                type="date"
                className="field"
                value={String(terms.checkout ?? "")}
                onChange={(e) => setField("checkout", e.target.value)}
              />
            </F>
            <F label="Voyageurs">
              <input
                type="number"
                className="field tnum"
                value={String(terms.guests ?? "")}
                onChange={(e) => setField("guests", Number(e.target.value))}
              />
            </F>
            <F label="Nuits">
              <input
                type="number"
                className="field tnum"
                value={String(terms.nights ?? "")}
                onChange={(e) => setField("nights", Number(e.target.value))}
              />
            </F>
            <F label="Montant total (XOF)">
              <input
                type="number"
                className="field tnum"
                value={String(terms.total_amount ?? "")}
                onChange={(e) => setField("total_amount", Number(e.target.value))}
              />
            </F>
            <F label="Acompte (XOF)">
              <input
                type="number"
                className="field tnum"
                value={String(terms.deposit_amount ?? "")}
                onChange={(e) => setField("deposit_amount", Number(e.target.value))}
              />
            </F>
          </div>
        </div>

        <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <h2 className="display text-[1.15rem] text-ink">Clauses</h2>
            <button
              onClick={() => setClauses([...clauses, { title: "", body: "" }])}
              className="press flex h-9 items-center gap-1.5 rounded-full border border-line px-3 text-[12.5px] text-ink-2 hover:border-ink/30"
            >
              <Plus className="h-3.5 w-3.5" /> Ajouter
            </button>
          </div>
          <div className="mt-4 space-y-4">
            {clauses.length === 0 && (
              <p className="text-[13px] text-ink-3">
                Aucune clause personnalisée — les clauses standard s&apos;appliquent.
              </p>
            )}
            {clauses.map((c, i) => (
              <div key={i} className="rounded-[10px] border border-line-soft p-3">
                <div className="flex gap-2">
                  <input
                    className="field flex-1"
                    placeholder="Titre de la clause"
                    value={c.title}
                    onChange={(e) =>
                      setClauses(clauses.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))
                    }
                  />
                  <button
                    onClick={() => setClauses(clauses.filter((_, j) => j !== i))}
                    className="press p-2 text-ink-3 hover:text-danger"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <textarea
                  className="field mt-2 min-h-[70px] resize-y"
                  placeholder="Texte de la clause"
                  value={c.body}
                  onChange={(e) =>
                    setClauses(clauses.map((x, j) => (j === i ? { ...x, body: e.target.value } : x)))
                  }
                />
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="press flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-6 text-[13.5px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saved ? (
            <>
              <Check className="h-4 w-4" /> Enregistré — visible chez le client
            </>
          ) : (
            "Enregistrer"
          )}
        </button>
      </div>

      {/* aperçu / signature */}
      <aside className="space-y-4">
        <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-ink-3">Aperçu</p>
          <p className="tnum mt-1 text-[13px] font-medium text-ink">{reference}</p>
          <dl className="mt-3 space-y-1.5 text-[13px]">
            <Row k="Client">{clientName}</Row>
            <Row k="Séjour">
              {terms.checkin ? formatDate(String(terms.checkin)) : "—"} →{" "}
              {terms.checkout ? formatDate(String(terms.checkout)) : "—"}
            </Row>
            <Row k="Total">{money("total_amount")}</Row>
            <Row k="Acompte">{money("deposit_amount")}</Row>
            <Row k="Signé client">
              {clientSignedAt ? formatDate(clientSignedAt) : "en attente"}
            </Row>
            <Row k="Contresigné">
              {countersignedAt ? formatDate(countersignedAt) : "non"}
            </Row>
          </dl>
          <a
            href={`/contrat/${reference}`}
            target="_blank"
            rel="noreferrer"
            className="press mt-3 inline-flex h-9 items-center rounded-full border border-line px-4 text-[12.5px] font-medium text-ink hover:border-ink/30"
          >
            Ouvrir le document
          </a>
        </div>

        {status === "signed" && (
          <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-5">
            <p className="text-[13px] font-medium text-ink">Contresigner</p>
            <input
              className="field mt-2"
              placeholder="Nom du signataire (équipe)"
              value={signName}
              onChange={(e) => setSignName(e.target.value)}
            />
            <button
              onClick={countersign}
              disabled={signing || signName.trim().length < 3}
              className="press mt-2 flex h-10 w-full items-center justify-center gap-2 rounded-full bg-ink text-[13px] font-medium text-bone disabled:opacity-50"
            >
              {signing ? <Loader2 className="h-4 w-4 animate-spin" /> : <PenLine className="h-4 w-4" />}
              Contresigner
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

function F({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
      {children}
    </label>
  );
}
function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-3">{k}</dt>
      <dd className="text-right text-ink">{children}</dd>
    </div>
  );
}
