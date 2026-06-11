import { createClient } from "@supabase/supabase-js";

/** Service-role client for system operations. Never expose to the browser. */
export function createSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase env vars: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** URL + anon key — enough for authenticated session reads (RLS). */
export function isSupabaseAuthConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/** URL + anon + service role — required for elevated admin/server writes. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    isSupabaseAuthConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
