import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { Mark } from "@/components/brand/mark";
import { aptImg } from "@/lib/site";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-bone lg:grid lg:grid-cols-[1fr_1.1fr]">
      {/* volet gauche — présentation */}
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
            <Mark className="h-8 w-8" tone="bone" />
            <span className="display text-[1.15rem]">Les 2 Palmiers</span>
          </Link>
          <div>
            <p className="display max-w-sm text-[2rem] leading-[1.12]">
              Profitez pleinement de votre temps.
            </p>
            <p className="mt-3 max-w-sm text-[15px] italic text-brass-3">
              Nous nous occupons du reste.
            </p>
          </div>
        </div>
      </aside>

      {/* volet droit — formulaire */}
      <main className="flex min-h-dvh flex-col">
        <div className="flex items-center justify-between px-6 py-6 lg:hidden">
          <Link href="/" className="flex items-center gap-2.5 text-ink">
            <Mark className="h-7 w-7" tone="ink" />
            <span className="display text-[1.05rem]">Les 2 Palmiers</span>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-16 pt-4 lg:pt-16">
          <div className="w-full max-w-[380px]">{children}</div>
        </div>
      </main>
    </div>
  );
}
