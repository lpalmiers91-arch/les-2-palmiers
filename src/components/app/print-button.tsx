"use client";

import { Download } from "lucide-react";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="press inline-flex h-10 items-center gap-2 rounded-full bg-ink px-5 text-[13px] font-medium text-bone hover:bg-forest-2"
    >
      <Download className="h-4 w-4" />
      Télécharger le reçu
    </button>
  );
}
