"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";

// Un seul client navigateur pour toute l'app → une seule connexion Realtime,
// une seule session. (Plusieurs instances = websockets en double + bugs de canal.)
let client: SupabaseClient<Database> | undefined;

export function createClient() {
  if (client) return client;
  client = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY);
  return client;
}
