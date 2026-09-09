"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export function ApartmentGallery({ media }: { media: { url: string; alt: string | null }[] }) {
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (open == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((i) => (i == null ? i : (i + 1) % media.length));
      if (e.key === "ArrowLeft") setOpen((i) => (i == null ? i : (i - 1 + media.length) % media.length));
    };
    document.addEventListener("keydown", onKey);
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.style.overflow = "";
    };
  }, [open, media.length]);

  if (media.length === 0) return null;
  const [hero, ...rest] = media;

  return (
    <>
      <div className="grid gap-2 sm:grid-cols-4 sm:grid-rows-2">
        <button
          onClick={() => setOpen(0)}
          className="press relative aspect-[4/3] overflow-hidden rounded-[var(--radius-lg)] ring-1 ring-ink/10 sm:col-span-2 sm:row-span-2 sm:aspect-auto"
        >
          <Image src={hero.url} alt={hero.alt ?? ""} fill sizes="(max-width:640px) 100vw, 50vw" className="object-cover" />
        </button>
        {rest.slice(0, 4).map((m, i) => (
          <button
            key={m.url}
            onClick={() => setOpen(i + 1)}
            className="press relative aspect-[4/3] overflow-hidden rounded-[var(--radius-card)] ring-1 ring-ink/10"
          >
            <Image src={m.url} alt={m.alt ?? ""} fill sizes="(max-width:640px) 50vw, 25vw" className="object-cover" />
            {i === 3 && media.length > 5 && (
              <span className="absolute inset-0 flex items-center justify-center bg-ink/55 text-[14px] font-medium text-bone">
                +{media.length - 5}
              </span>
            )}
          </button>
        ))}
      </div>

      {open != null && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-ink/90 p-4"
          onClick={() => setOpen(null)}
        >
          <button
            onClick={() => setOpen(null)}
            aria-label="Fermer"
            className="press absolute right-4 top-4 text-bone/70 hover:text-bone"
          >
            <X className="h-6 w-6" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpen((i) => (i == null ? i : (i - 1 + media.length) % media.length));
            }}
            aria-label="Précédent"
            className="press absolute left-3 text-bone/70 hover:text-bone sm:left-6"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>
          <div className="relative h-[80dvh] w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <Image
              src={media[open].url}
              alt={media[open].alt ?? ""}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setOpen((i) => (i == null ? i : (i + 1) % media.length));
            }}
            aria-label="Suivant"
            className="press absolute right-3 text-bone/70 hover:text-bone sm:right-6"
          >
            <ChevronRight className="h-7 w-7" />
          </button>
        </div>
      )}
    </>
  );
}
