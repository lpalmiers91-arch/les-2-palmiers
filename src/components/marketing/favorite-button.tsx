"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n/provider";

export function FavoriteButton({
  apartmentId,
  initial = false,
  authed,
  variant = "icon",
}: {
  apartmentId: string;
  initial?: boolean;
  authed: boolean;
  variant?: "icon" | "full";
}) {
  const { t } = useT();
  const router = useRouter();
  const [fav, setFav] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!authed) {
      router.push(`/connexion?suite=${encodeURIComponent(`/appartements`)}`);
      return;
    }
    setBusy(true);
    const optimistic = !fav;
    setFav(optimistic);
    const { data, error } = await createClient().rpc("toggle_favorite", { p_apartment: apartmentId });
    setBusy(false);
    if (error) setFav(!optimistic);
    else setFav(data as boolean);
    router.refresh();
  }

  if (variant === "full") {
    return (
      <button
        onClick={toggle}
        disabled={busy}
        className={`press inline-flex h-11 items-center gap-2 rounded-full border px-4 text-[13px] font-medium transition-colors ${
          fav ? "border-danger/40 bg-danger/5 text-danger" : "border-line text-ink-2 hover:border-ink/25"
        }`}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Heart className={`h-4 w-4 ${fav ? "fill-danger" : ""}`} />
        )}
        {fav ? t("favorites.saved") : t("favorites.save")}
      </button>
    );
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-label={fav ? t("favorites.saved") : t("favorites.save")}
      aria-pressed={fav}
      className="press absolute left-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-bone/85 text-ink backdrop-blur transition-colors hover:bg-bone"
    >
      {busy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Heart className={`h-4 w-4 ${fav ? "fill-danger text-danger" : "text-ink-2"}`} />
      )}
    </button>
  );
}
