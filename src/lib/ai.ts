import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/** L'assistant IA est-il actif pour cet espace ? (mis en cache par requête) */
export const aiSpaceEnabled = cache(async (space: string): Promise<boolean> => {
  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc("ai_space_enabled", { p_space: space });
    return data !== false;
  } catch {
    return true;
  }
});
