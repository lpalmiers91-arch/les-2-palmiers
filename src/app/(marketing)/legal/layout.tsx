import type { ReactNode } from "react";

export default function LegalLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-bone">
      <div className="mx-auto max-w-2xl px-5 pb-24 pt-[128px] md:px-8 md:pt-[152px]">
        <article className="legal-prose">{children}</article>
      </div>
    </div>
  );
}
