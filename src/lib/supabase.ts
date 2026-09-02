import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** Null when the env vars aren't set. The whole game still plays as a guest —
 *  a missing key must never be a blank page. Vite inlines these at build time,
 *  so adding them to Vercel after a deploy does nothing until you redeploy. */
export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key) : null;

export const authConfigured = Boolean(supabase);
