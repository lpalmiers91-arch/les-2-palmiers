import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getApartment, listApartments } from "@/lib/apartments";
import { getFavoriteState } from "@/lib/favorites";
import { ApartmentDetailView } from "@/components/apartments/apartment-detail-view";

export const metadata: Metadata = { title: "Appartement" };

export default async function AppApartmentDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const apt = await getApartment(slug);
  if (!apt) notFound();

  const [others, fav] = await Promise.all([
    listApartments().then((l) => l.filter((a) => a.slug !== slug).slice(0, 3)),
    getFavoriteState(),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <ApartmentDetailView
        apt={apt}
        others={others}
        favInitial={fav.ids.has(apt.id)}
        favAuthed={fav.authed}
        basePath="/app/appartements"
        bookPath="/app/reserver"
      />
    </div>
  );
}
