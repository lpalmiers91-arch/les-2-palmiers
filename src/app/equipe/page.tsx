import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { aptImg } from "@/lib/site";
import { TeamAuthForm } from "@/components/auth/team-auth-form";

export const metadata: Metadata = {
  title: "Espace équipe",
  robots: { index: false, follow: false },
};

export default function EquipePage() {
  return (
    <div className="min-h-dvh bg-bone lg:grid lg:grid-cols-[1fr_1.1fr]">
      {/* volet gauche — présentation (identique aux pages de connexion) */}
      <aside className="relative hidden overflow-hidden bg-forest text-bone lg:block">
        <Image
          src={aptImg("terrace-palms.jpg")}
          alt=""
          fill
          sizes="45vw"
          className="object-cover object-[50%_78%] opacity-40"
        />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Link href="/" className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-staff.png" alt="Les 2 Palmiers — Équipe" className="h-16 w-auto" />
          </Link>
          <div>
            <p className="display max-w-sm text-[2rem] leading-[1.12]">
              Le poste de pilotage de la conciergerie.
            </p>
            <p className="mt-3 max-w-sm text-[15px] italic text-brass-3">
              Réservations, services, clients — au même endroit.
            </p>
          </div>
        </div>
      </aside>

      {/* volet droit — formulaire */}
      <main className="flex min-h-dvh flex-col">
        <div className="flex items-center justify-between px-6 py-6">
          <Link href="/" className="flex items-center gap-2.5 text-ink lg:invisible">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/wordmark.png" alt="Les 2 Palmiers" className="h-7 w-auto" />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-16 pt-4 lg:pt-16">
          <div className="w-full max-w-[380px]">
            <Suspense>
              <TeamAuthForm />
            </Suspense>
          </div>
        </div>
      </main>
    </div>
  );
}
