import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Updates ea_users.last_active_at to now() for the given Clerk user.
 * Fire-and-forget: errors are swallowed so this never blocks the request.
 *
 * Used by /api/chat and /api/ernaehrungsplan/generieren so the daily
 * inactive-account cron knows when a user was last seen.
 */
export async function touchLastActive(
  supabase: SupabaseClient,
  clerkId: string
): Promise<void> {
  try {
    await supabase
      .from("ea_users")
      .update({ last_active_at: new Date().toISOString() })
      .eq("clerk_id", clerkId);
  } catch (err) {
    console.error("[last-active] update failed:", err);
  }
}
