"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, Plus, Upload, Star, Trash2, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { aptImg } from "@/lib/site";

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 48) || "logement"
  );
}

export function NewApartmentButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function create() {
    if (name.trim().length < 3) {
      setErr("Donnez un nom d'au moins 3 caractères.");
      return;
    }
    setBusy(true);
    setErr(null);
    const slug = `${slugify(name)}-${Math.random().toString(36).slice(2, 6)}`;
    const { data, error } = await createClient()
      .from("apartments")
      .insert({ name: name.trim(), slug, status: "draft" })
      .select("id")
      .single();
    setBusy(false);
    if (error || !data) {
      setErr("Création impossible.");
      return;
    }
    router.push(`/staff/appartements/${data.id}`);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="press flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-medium text-bone hover:bg-forest-2"
      >
        <Plus className="h-4 w-4" /> Nouvel appartement
      </button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        autoFocus
        className="field h-10 w-56"
        placeholder="Nom du logement"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && create()}
      />
      <button
        onClick={create}
        disabled={busy}
        className="press flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-medium text-bone disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        Créer
      </button>
      <button onClick={() => setOpen(false)} className="press p-1 text-ink-3">
        <X className="h-4 w-4" />
      </button>
      {err && <p className="w-full text-[12px] text-danger">{err}</p>}
    </div>
  );
}

export type ApartmentRow = {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  description: string | null;
  address: string | null;
  map_url: string | null;
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  base_price: number;
  cleaning_fee: number;
  checkin_from: string | null;
  checkout_before: string | null;
  cancellation_policy: string;
  status: string;
};

export type MediaRow = {
  id: string;
  storage_path: string;
  alt: string | null;
  position: number;
  is_cover: boolean;
};

export type BlockRow = {
  id: string;
  date_range: string;
  reason: string;
  note: string | null;
};

export function ApartmentEditor({
  apartment,
  media,
  blocks,
}: {
  apartment: ApartmentRow;
  media: MediaRow[];
  blocks: BlockRow[];
}) {
  const router = useRouter();
  const [a, setA] = useState(apartment);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function f<K extends keyof ApartmentRow>(k: K, v: ApartmentRow[K]) {
    setA((p) => ({ ...p, [k]: v }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaved(false);
    setErr(null);
    const { error } = await createClient()
      .from("apartments")
      .update({
        name: a.name,
        summary: a.summary,
        description: a.description,
        address: a.address,
        map_url: a.map_url,
        capacity: a.capacity,
        bedrooms: a.bedrooms,
        bathrooms: a.bathrooms,
        base_price: a.base_price,
        cleaning_fee: a.cleaning_fee,
        checkin_from: a.checkin_from || null,
        checkout_before: a.checkout_before || null,
        cancellation_policy: a.cancellation_policy,
        status: a.status,
      })
      .eq("id", a.id);
    setSaving(false);
    if (error) {
      setErr("Enregistrement impossible.");
      return;
    }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="space-y-6">
      <form onSubmit={save} className="rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="display text-[1.15rem] text-ink">Fiche</h2>
          <select
            value={a.status}
            onChange={(e) => f("status", e.target.value)}
            className="field h-9 w-36 text-[13px]"
          >
            <option value="draft">Brouillon</option>
            <option value="published">En ligne</option>
            <option value="hidden">Masqué</option>
          </select>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <L label="Nom" full>
            <input className="field" value={a.name} onChange={(e) => f("name", e.target.value)} />
          </L>
          <L label="Résumé court" full>
            <input
              className="field"
              value={a.summary ?? ""}
              onChange={(e) => f("summary", e.target.value)}
              placeholder="Une phrase d'accroche"
            />
          </L>
          <L label="Description" full>
            <textarea
              className="field min-h-[110px] resize-y"
              value={a.description ?? ""}
              onChange={(e) => f("description", e.target.value)}
            />
          </L>
          <L label="Adresse" full>
            <input
              className="field"
              value={a.address ?? ""}
              onChange={(e) => f("address", e.target.value)}
              placeholder="Quartier, ville"
            />
          </L>
          <L label="Lien localisation (Google Maps)" full>
            <input
              className="field"
              value={a.map_url ?? ""}
              onChange={(e) => f("map_url", e.target.value)}
              placeholder="https://maps.google.com/…"
            />
          </L>
          <L label="Capacité (personnes)">
            <input
              type="number"
              min={1}
              className="field tnum"
              value={a.capacity}
              onChange={(e) => f("capacity", Number(e.target.value))}
            />
          </L>
          <L label="Chambres">
            <input
              type="number"
              min={0}
              className="field tnum"
              value={a.bedrooms}
              onChange={(e) => f("bedrooms", Number(e.target.value))}
            />
          </L>
          <L label="Salles de bain">
            <input
              type="number"
              min={0}
              className="field tnum"
              value={a.bathrooms}
              onChange={(e) => f("bathrooms", Number(e.target.value))}
            />
          </L>
          <L label="Prix / nuit (XOF)">
            <input
              type="number"
              min={0}
              className="field tnum"
              value={a.base_price}
              onChange={(e) => f("base_price", Number(e.target.value))}
            />
          </L>
          <L label="Frais de ménage (XOF)">
            <input
              type="number"
              min={0}
              className="field tnum"
              value={a.cleaning_fee}
              onChange={(e) => f("cleaning_fee", Number(e.target.value))}
            />
          </L>
          <L label="Politique d'annulation">
            <select
              className="field"
              value={a.cancellation_policy}
              onChange={(e) => f("cancellation_policy", e.target.value)}
            >
              <option value="flexible">Flexible</option>
              <option value="moderate">Modérée</option>
              <option value="strict">Stricte</option>
            </select>
          </L>
          <L label="Arrivée à partir de">
            <input
              type="time"
              className="field"
              value={a.checkin_from ?? ""}
              onChange={(e) => f("checkin_from", e.target.value)}
            />
          </L>
          <L label="Départ avant">
            <input
              type="time"
              className="field"
              value={a.checkout_before ?? ""}
              onChange={(e) => f("checkout_before", e.target.value)}
            />
          </L>
        </div>

        {err && <p className="mt-4 text-[13px] text-danger">{err}</p>}

        <button
          type="submit"
          disabled={saving}
          className="press mt-5 flex h-11 items-center justify-center gap-2 rounded-full bg-ink px-6 text-[13.5px] font-medium text-bone hover:bg-forest-2 disabled:opacity-50"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          {saved ? (
            <>
              <Check className="h-4 w-4" /> Enregistré
            </>
          ) : (
            "Enregistrer la fiche"
          )}
        </button>
      </form>

      <PhotoManager apartmentId={a.id} media={media} />
      <AvailabilityManager apartmentId={a.id} blocks={blocks} />
    </div>
  );
}

function L({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="mb-1.5 block text-[13px] font-medium text-ink-2">{label}</span>
      {children}
    </label>
  );
}

function PhotoManager({ apartmentId, media }: { apartmentId: string; media: MediaRow[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setBusy(true);
    setErr(null);
    const supabase = createClient();
    try {
      for (const file of files) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${apartmentId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("apartment-media")
          .upload(path, file, { contentType: file.type });
        if (upErr) throw upErr;
        await supabase.from("apartment_media").insert({
          apartment_id: apartmentId,
          type: "photo",
          storage_path: path,
          position: media.length,
          is_cover: media.length === 0,
        });
      }
      router.refresh();
    } catch {
      setErr("Le téléversement a échoué.");
    } finally {
      setBusy(false);
    }
  }

  async function setCover(id: string) {
    const supabase = createClient();
    await supabase.from("apartment_media").update({ is_cover: false }).eq("apartment_id", apartmentId);
    await supabase.from("apartment_media").update({ is_cover: true }).eq("id", id);
    router.refresh();
  }

  async function remove(m: MediaRow) {
    const supabase = createClient();
    await supabase.storage.from("apartment-media").remove([m.storage_path]);
    await supabase.from("apartment_media").delete().eq("id", m.id);
    router.refresh();
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <h2 className="display text-[1.15rem] text-ink">Photos</h2>
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="press flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-[13px] font-medium text-ink hover:border-ink/30 disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Ajouter
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/avif"
          multiple
          className="hidden"
          onChange={onUpload}
        />
      </div>

      {err && <p className="mt-3 text-[13px] text-danger">{err}</p>}

      {media.length === 0 ? (
        <p className="mt-3 text-[13px] text-ink-3">
          Aucune photo. Ajoutez-en au moins une pour publier.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {media.map((m) => (
            <div
              key={m.id}
              className="group relative overflow-hidden rounded-[10px] border border-line-soft bg-bone-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={aptImg(m.storage_path)}
                alt={m.alt ?? ""}
                className="aspect-[4/3] w-full object-cover"
              />
              {m.is_cover && (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-ink/80 px-1.5 py-0.5 text-[10px] font-medium text-bone">
                  Couverture
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-ink/60 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                {!m.is_cover && (
                  <button
                    onClick={() => setCover(m.id)}
                    title="Définir comme couverture"
                    className="press rounded-full bg-bone/90 p-1.5 text-ink"
                  >
                    <Star className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => remove(m)}
                  title="Supprimer"
                  className="press rounded-full bg-bone/90 p-1.5 text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AvailabilityManager({ apartmentId, blocks }: { apartmentId: string; blocks: BlockRow[] }) {
  const router = useRouter();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("owner");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function parse(range: string) {
    const m = range.match(/[[(]"?([^,"]+)"?,"?([^,")]+)"?[)\]]/);
    return m ? { start: m[1], end: m[2] } : { start: "", end: "" };
  }

  async function add() {
    setErr(null);
    if (!from || !to || from >= to) {
      setErr("Choisissez une période valide.");
      return;
    }
    setBusy(true);
    const { error } = await createClient()
      .from("availability_blocks")
      .insert({ apartment_id: apartmentId, date_range: `[${from},${to})`, reason });
    setBusy(false);
    if (error) {
      setErr("Cette période chevauche un blocage existant.");
      return;
    }
    setFrom("");
    setTo("");
    router.refresh();
  }

  async function remove(id: string) {
    await createClient().from("availability_blocks").delete().eq("id", id);
    router.refresh();
  }

  const REASONS: Record<string, string> = {
    owner: "Réservé propriétaire",
    maintenance: "Maintenance",
    external_ical: "Autre plateforme",
    other: "Autre",
  };

  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-5 sm:p-6">
      <h2 className="display text-[1.15rem] text-ink">Disponibilités</h2>
      <p className="mt-1 text-[13px] text-ink-3">
        Bloquez les dates où le logement n&apos;est pas louable.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="mb-1 block text-[12px] text-ink-3">Du</span>
          <input type="date" className="field h-10" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[12px] text-ink-3">Au</span>
          <input type="date" className="field h-10" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <select className="field h-10 w-44" value={reason} onChange={(e) => setReason(e.target.value)}>
          {Object.entries(REASONS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <button
          onClick={add}
          disabled={busy}
          className="press flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-medium text-bone disabled:opacity-50"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Bloquer
        </button>
      </div>
      {err && <p className="mt-2 text-[13px] text-danger">{err}</p>}

      {blocks.length > 0 && (
        <ul className="mt-4 divide-y divide-line-soft">
          {blocks.map((b) => {
            const { start, end } = parse(b.date_range);
            return (
              <li key={b.id} className="flex items-center justify-between py-2.5 text-[13px]">
                <span className="text-ink-2">
                  {start} → {end} ·{" "}
                  <span className="text-ink-3">{REASONS[b.reason] ?? b.reason}</span>
                </span>
                <button onClick={() => remove(b.id)} className="press p-1 text-ink-3 hover:text-danger">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
