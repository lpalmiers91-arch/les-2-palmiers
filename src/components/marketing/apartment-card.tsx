import Image from "next/image";
import Link from "next/link";
import { Users, BedDouble, ArrowUpRight } from "lucide-react";
import { getT } from "@/lib/i18n";
import { Price } from "@/lib/currency";
import type { ApartmentCard as Apt } from "@/lib/apartments";

export async function ApartmentCard({ apt }: { apt: Apt }) {
  const { t } = await getT();
  return (
    <Link
      href={`/appartements/${apt.slug}`}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-bone transition-colors hover:border-ink/25"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-bone-2">
        {apt.cover ? (
          <Image
            src={apt.cover}
            alt={apt.name}
            fill
            sizes="(max-width: 640px) 100vw, 420px"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : null}
        <span className="absolute right-3 top-3 rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-medium text-bone backdrop-blur">
          {t("aptPub.from")} <Price xof={apt.base_price} /> {t("aptPub.perNight")}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="display text-[1.15rem] leading-tight text-ink">{apt.name}</p>
        {apt.address && <p className="mt-0.5 text-[12.5px] text-ink-3">{apt.address}</p>}
        {apt.summary && (
          <p className="mt-2 line-clamp-2 text-[13.5px] leading-relaxed text-ink-2">{apt.summary}</p>
        )}
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12.5px] text-ink-3">
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> {t("aptPub.guestsN",{n:apt.capacity})}
          </span>
          <span className="flex items-center gap-1.5">
            <BedDouble className="h-3.5 w-3.5" /> {t("aptPub.bedroomsN",{n:apt.bedrooms})}
          </span>
        </div>
        <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-forest-2">
          {t("aptPub.viewApt")}
          <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </span>
      </div>
    </Link>
  );
}
