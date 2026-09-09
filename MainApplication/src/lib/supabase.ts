import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Typed Supabase client stub (Phase 2).
 * Reads only VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.
 * No fetch/auth logic here — the auth-wiring pass adds session handling
 * without changing this module's shape.
 */

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ?? "https://placeholder.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ?? "placeholder-anon-key";

export const isSupabaseConfigured =
  Boolean(import.meta.env.VITE_SUPABASE_URL) &&
  Boolean(import.meta.env.VITE_SUPABASE_ANON_KEY);

export const supabase: SupabaseClient = createClient(
  supabaseUrl,
  supabaseAnonKey,
);
