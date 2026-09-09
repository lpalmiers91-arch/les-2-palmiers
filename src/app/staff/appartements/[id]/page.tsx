import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  ApartmentEditor,
  type ApartmentRow,
  type MediaRow,
  type BlockRow,
} from "@/components/console/apartment-editor";

export const metadata: Metadata = { title: "Modifier l'appartement" };

export default async function ApartmentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: apartment } = await supabase
    .from("apartments")
    .select(
      "id, slug, name, summary, description, address, map_url, capacity, bedrooms, bathrooms, base_price, cleaning_fee, checkin_from, checkout_before, cancellation_policy, status",
    )
    .eq("id", id)
    .maybeSingle();

  if (!apartment) notFound();

  const [{ data: media }, { data: blocks }] = await Promise.all([
    supabase
      .from("apartment_media")
      .select("id, storage_path, alt, position, is_cover")
      .eq("apartment_id", id)
      .order("position"),
    supabase
      .from("availability_blocks")
      .select("id, date_range, reason, note")
      .eq("apartment_id", id)
      .order("date_range"),
  ]);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/staff/appartements"
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Tous les appartements
      </Link>
      <h1 className="display mt-3 text-[1.7rem] text-ink sm:text-[2rem]">{apartment.name}</h1>
      <div className="mt-6">
        <ApartmentEditor
          apartment={apartment as ApartmentRow}
          media={(media ?? []) as MediaRow[]}
          blocks={(blocks ?? []) as BlockRow[]}
        />
      </div>
    </div>
  );
}
