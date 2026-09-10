import { Mark } from "@/components/brand/mark";

/**
 * Écran d'attente de segment (Next `loading.tsx`). Discret, centré, sans texte
 * à traduire : la marque qui respire suffit et reste juste quelques instants.
 */
export function RouteLoading({ full = false }: { full?: boolean }) {
  return (
    <div
      className={`flex items-center justify-center ${full ? "min-h-dvh" : "min-h-[60vh]"}`}
      role="status"
      aria-label="Chargement"
    >
      <Mark className="h-10 w-10 animate-pulse motion-reduce:animate-none" tone="ink" />
    </div>
  );
}
