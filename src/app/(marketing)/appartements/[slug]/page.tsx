import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getApartment, listApartments } from "@/lib/apartments";
import { getT } from "@/lib/i18n";
import { getFavoriteState } from "@/lib/favorites";
import { createClient } from "@/lib/supabase/server";
import { JsonLd, apartmentLd, breadcrumbLd } from "@/components/seo/json-ld";
import { site } from "@/lib/site";
import { ApartmentDetailView } from "@/components/apartments/apartment-detail-view";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const apt = await getApartment(slug);
  if (!apt) return { title: "Appartement introuvable" };
  const { pageMeta } = await import("@/lib/seo");
  return pageMeta(`/appartements/${slug}`, {
    title: `${apt.name} — appartement meublé à Cotonou`,
    description:
      apt.summary ??
      `${apt.name}, appartement meublé pour ${apt.capacity} voyageurs à Cotonou. Réservation en ligne, conciergerie incluse.`,
  });
}

export default async function ApartmentDetail({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { t } = await getT();
  const apt = await getApartment(slug);
  if (!apt) notFound();

  const supabase = await createClient();
  const [others, fav, { data: rev }] = await Promise.all([
    listApartments().then((l) => l.filter((a) => a.slug !== slug).slice(0, 3)),
    getFavoriteState(),
    supabase.from("reviews").select("rating").eq("status", "published"),
  ]);

  const rating =
    rev && rev.length > 0
      ? {
          value: Math.round((rev.reduce((s, r) => s + r.rating, 0) / rev.length) * 10) / 10,
          count: rev.length,
        }
      : null;

  return (
    <div className="bg-bone">
      <JsonLd
        data={[
          apartmentLd({ ...apt, rating }),
          breadcrumbLd([
            { name: "Les 2 Palmiers", url: site.url },
            { name: t("aptPub.eyebrow"), url: `${site.url}/appartements` },
            { name: apt.name, url: `${site.url}/appartements/${apt.slug}` },
          ]),
        ]}
      />
      <div className="mx-auto max-w-6xl px-5 pb-24 pt-[104px] md:px-8 md:pt-[132px]">
        <ApartmentDetailView
          apt={apt}
          others={others}
          favInitial={fav.ids.has(apt.id)}
          favAuthed={fav.authed}
          basePath="/appartements"
          bookPath="/reserver"
        />
      </div>
    </div>
  );
}
