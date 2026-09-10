import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Rates } from "@/lib/money";

const FALLBACK: Rates = { EUR: 655.957, USD: 605, GBP: 770, CAD: 445 };

export const getFxConfig = cache(async (): Promise<{ enabled: boolean; rates: Rates }> => {
  try {
    const supabase = await createClient();
    const { data } = await supabase.rpc("fx_config");
    const cfg = data as { enabled?: boolean; rates?: Rates } | null;
    return {
      enabled: cfg?.enabled ?? true,
      rates: cfg?.rates && Object.keys(cfg.rates).length > 0 ? cfg.rates : FALLBACK,
    };
  } catch {
    return { enabled: true, rates: FALLBACK };
  }
});
