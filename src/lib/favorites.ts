import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export const getFavoriteState = cache(async (): Promise<{ authed: boolean; ids: Set<string> }> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { authed: false, ids: new Set() };
  const { data } = await supabase.from("favorites").select("apartment_id").eq("client_id", user.id);
  return { authed: true, ids: new Set((data ?? []).map((r) => r.apartment_id as string)) };
});
