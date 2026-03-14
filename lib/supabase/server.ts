import { createClient } from "@supabase/supabase-js";

/**
 * Creates a Supabase client with service role key (bypasses RLS).
 * Used in all server-side code after Clerk auth verification.
 *
 * IMPORTANT: Always verify the user via Clerk's auth() before using this client.
 * Filter queries by userId manually since RLS is disabled.
 */
export function createSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Keep backward compatibility alias during migration
export const createSupabaseServer = createSupabaseAdmin;
