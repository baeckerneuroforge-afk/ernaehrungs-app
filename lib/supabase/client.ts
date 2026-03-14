import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client-side Supabase client.
 * Only used for Realtime subscriptions (e.g. admin message notifications).
 * NOT used for auth or data queries – those go through API routes.
 */
export function createClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
