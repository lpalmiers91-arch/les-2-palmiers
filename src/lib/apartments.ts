import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { aptImg } from "@/lib/site";

export type ApartmentCard = {
  id: string;
  slug: string;
  name: string;
  summary: string | null;
  address: string | null;
  capacity: number;
  bedrooms: number;
  bathrooms: number;
  base_price: number;
  cover: string | null;
};

export type ApartmentFull = ApartmentCard & {
  description: string | null;
  cleaning_fee: number;
  map_url: string | null;
  checkin_from: string | null;
  checkout_before: string | null;
  cancellation_policy: string;
  media: { url: string; alt: string | null }[];
  amenities: { amenity_key: string; detail: string | null }[];
};

function coverUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return /^https?:\/\//.test(path) ? path : aptImg(path);
}

/** Appartements publiés, avec photo de couverture, pour la liste. */
export const listApartments = cache(async (): Promise<ApartmentCard[]> => {
  const supabase = await createClient();
  const { data: apts } = await supabase
    .from("apartments")
    .select("id, slug, name, summary, address, capacity, bedrooms, bathrooms, base_price")
    .eq("status", "published")
    .order("created_at");
  if (!apts?.length) return [];

  const { data: media } = await supabase
    .from("apartment_media")
    .select("apartment_id, storage_path, is_cover, position")
    .in(
      "apartment_id",
      apts.map((a) => a.id),
    )
    .order("position");

  return apts.map((a) => {
    const own = (media ?? []).filter((m) => m.apartment_id === a.id);
    const cov = own.find((m) => m.is_cover) ?? own[0];
    return { ...a, cover: coverUrl(cov?.storage_path) };
  });
});

/** Un appartement publié complet (galerie + équipements), par slug. */
export const getApartment = cache(async (slug: string): Promise<ApartmentFull | null> => {
  const supabase = await createClient();
  const { data: a } = await supabase
    .from("apartments")
    .select(
      "id, slug, name, summary, description, address, capacity, bedrooms, bathrooms, base_price, cleaning_fee, map_url, checkin_from, checkout_before, cancellation_policy, status",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!a || a.status !== "published") return null;

  const [{ data: media }, { data: amenities }] = await Promise.all([
    supabase
      .from("apartment_media")
      .select("storage_path, alt, is_cover, position")
      .eq("apartment_id", a.id)
      .order("position"),
    supabase
      .from("apartment_amenities")
      .select("amenity_key, detail, position")
      .eq("apartment_id", a.id)
      .order("position"),
  ]);

  const gallery = (media ?? [])
    .slice()
    .sort((x, y) => Number(y.is_cover) - Number(x.is_cover) || x.position - y.position)
    .map((m) => ({ url: coverUrl(m.storage_path)!, alt: m.alt }));

  return {
    id: a.id,
    slug: a.slug,
    name: a.name,
    summary: a.summary,
    description: a.description,
    address: a.address,
    capacity: a.capacity,
    bedrooms: a.bedrooms,
    bathrooms: a.bathrooms,
    base_price: a.base_price,
    cleaning_fee: a.cleaning_fee,
    map_url: a.map_url,
    checkin_from: a.checkin_from,
    checkout_before: a.checkout_before,
    cancellation_policy: a.cancellation_policy,
    cover: gallery[0]?.url ?? null,
    media: gallery,
    amenities: amenities ?? [],
  };
});
