import { Suspense } from "react";
import type { Metadata } from "next";
import { Mark } from "@/components/brand/mark";
import { TeamAuthForm } from "@/components/auth/team-auth-form";

export const metadata: Metadata = {
  title: "Espace équipe",
  robots: { index: false, follow: false },
};

export default function EquipePage() {
  return (
    <div className="grain relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-forest px-6 py-16 text-bone">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 right-[-10%] h-[520px] w-[520px] rounded-full opacity-30"
        style={{ background: "radial-gradient(closest-side, rgba(230,197,139,0.25), transparent 70%)" }}
      />
      <div className="relative flex w-full max-w-[360px] flex-col">
        <div className="mb-10 flex items-center gap-2.5">
          <Mark className="h-8 w-8" tone="bone" />
          <span className="display text-[1.1rem]">Les 2 Palmiers</span>
        </div>
        <Suspense>
          <TeamAuthForm />
        </Suspense>
      </div>
    </div>
  );
}
