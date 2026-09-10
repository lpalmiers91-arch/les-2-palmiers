import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Users, BedDouble, Bath, MapPin, ArrowRight } from "lucide-react";
import { getApartment, listApartments } from "@/lib/apartments";
import { ApartmentGallery } from "@/components/marketing/apartment-gallery";
import { ApartmentCard } from "@/components/marketing/apartment-card";
import { AMENITY } from "@/lib/amenities";
import { getT } from "@/lib/i18n";
import { Price } from "@/lib/currency";
import { getFavoriteState } from "@/lib/favorites";
import { FavoriteButton } from "@/components/marketing/favorite-button";
import { createClient } from "@/lib/supabase/server";
import { JsonLd, apartmentLd, breadcrumbLd } from "@/components/seo/json-ld";
import { site } from "@/lib/site";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const apt = await getApartment(slug);
  if (!apt) return { title: "Appartement introuvable" };
  return {
    title: apt.name,
    description: apt.summary ?? undefined,
  };
}

function cancelLabel(t: (k: string) => string, p: string) {
  return { flexible: t("aptPub.cancelFlex"), moderate: t("aptPub.cancelMod"), strict: t("aptPub.cancelStrict") }[p] ?? t("aptPub.cancelMod");
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

  const others = (await listApartments()).filter((a) => a.slug !== slug).slice(0, 3);
  const paras = (apt.description ?? "").split(/\n{2,}/).filter(Boolean);

  const supabase = await createClient();
  const fav = await getFavoriteState();
  const { data: rev } = await supabase
    .from("reviews")
    .select("rating")
    .eq("status", "published");
  const rating =
    rev && rev.length > 0
      ? { value: Math.round((rev.reduce((s, r) => s + r.rating, 0) / rev.length) * 10) / 10, count: rev.length }
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
        <Link
          href="/appartements"
          className="inline-flex items-center gap-1.5 text-[13px] text-ink-3 hover:text-ink"
        >
          ← {t("aptPub.allApts")}
        </Link>

        <header className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="display text-[2.2rem] leading-[1.05] text-ink md:text-[2.8rem]">
              {apt.name}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-ink-3">
              {apt.address && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" /> {apt.address}
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> {t("aptPub.guestsN",{n:apt.capacity})}
              </span>
              <span className="flex items-center gap-1.5">
                <BedDouble className="h-3.5 w-3.5" /> {t("aptPub.bedroomsN",{n:apt.bedrooms})}
              </span>
              <span className="flex items-center gap-1.5">
                <Bath className="h-3.5 w-3.5" /> {t("aptPub.bathroomsN",{n:apt.bathrooms})}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {fav.authed && (
              <FavoriteButton
                apartmentId={apt.id}
                initial={fav.ids.has(apt.id)}
                authed={fav.authed}
                variant="full"
              />
            )}
            <Link
              href={`/reserver?apartment=${apt.slug}`} data-track="reserver-apartment"
              className="press inline-flex h-12 items-center gap-2 rounded-full bg-ink px-6 text-[14px] font-medium text-bone hover:bg-forest-2"
            >
              {t("aptPub.from")} <Price xof={apt.base_price} />{t("aptPub.perNight")}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </header>

        <div className="mt-8">
          <ApartmentGallery media={apt.media} />
        </div>

        <div className="mt-14 grid gap-x-14 gap-y-10 border-t border-ink/15 pt-10 lg:grid-cols-[1.5fr_1fr]">
          <div>
            {paras.length > 0 ? (
              <div className="space-y-4 text-[1.02rem] leading-relaxed text-ink-2">
                {paras.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            ) : (
              <p className="text-[1.02rem] leading-relaxed text-ink-2">{apt.summary}</p>
            )}

            {apt.amenities.length > 0 && (
              <>
                <h2 className="mt-10 text-[13px] font-semibold uppercase tracking-[0.18em] text-ink-3">
                  {t("aptPub.equipment")}
                </h2>
                <ul className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
                  {apt.amenities.map((a) => {
                    const meta = AMENITY[a.amenity_key];
                    const Icon = meta?.icon;
                    return (
                      <li key={a.amenity_key} className="flex items-start gap-2.5 border-b border-line-soft pb-2.5">
                        {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-forest-2" />}
                        <span className="min-w-0">
                          <span className="block text-[14.5px] text-ink">
                            {meta?.label ?? a.amenity_key}
                          </span>
                          {a.detail && <span className="block text-[12.5px] text-ink-3">{a.detail}</span>}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-[var(--radius-lg)] border border-line bg-bone p-5">
              <p className="display text-[1.5rem] text-ink">
                <Price xof={apt.base_price} />
                <span className="text-[13px] font-normal text-ink-3"> {t("aptPub.perNight")}</span>
              </p>
              <dl className="mt-4 space-y-2.5 border-t border-line pt-4 text-[13.5px]">
                <Row k={t("aptPub.cleaning")}><Price xof={apt.cleaning_fee} /></Row>
                <Row k={t("aptPub.checkin")}>{apt.checkin_from ? t("aptPub.fromTime",{time:apt.checkin_from.slice(0,5)}) : t("aptPub.checkinDefault")}</Row>
                <Row k={t("aptPub.checkout")}>{apt.checkout_before ? t("aptPub.beforeTime",{time:apt.checkout_before.slice(0,5)}) : t("aptPub.checkoutDefault")}</Row>
                <Row k={t("aptPub.cancellation")}>{cancelLabel(t, apt.cancellation_policy)}</Row>
              </dl>
              <Link
                href={`/reserver?apartment=${apt.slug}`} data-track="reserver-apartment"
                className="press mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-ink text-[14px] font-medium text-bone hover:bg-forest-2"
              >
                {t("aptPub.checkDates")} <ArrowRight className="h-4 w-4" />
              </Link>
              {apt.map_url && (
                <a
                  href={apt.map_url}
                  target="_blank"
                  rel="noreferrer"
                  className="press mt-2 flex h-10 w-full items-center justify-center gap-1.5 rounded-full border border-line text-[13px] font-medium text-ink hover:border-ink/30"
                >
                  <MapPin className="h-3.5 w-3.5" /> {t("aptPub.viewMap")}
                </a>
              )}
            </div>
          </aside>
        </div>

        {others.length > 0 && (
          <section className="mt-20 border-t border-ink/15 pt-12">
            <h2 className="display text-[1.6rem] text-ink">{t("aptPub.otherPlaces")}</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {others.map((a) => (
                <ApartmentCard key={a.id} apt={a} />
              ))}
            </div>
          </section>
        )}
      </div>
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
