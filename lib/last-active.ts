import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Updates ea_users.last_active_at for the given Clerk user — but at most once
 * per hour per user (in-memory throttle, P14). Der Inactive-Account-Cron laeuft
 * taeglich, also reicht stuendliche Genauigkeit; zuvor schrieb jede KI-Anfrage
 * ein UPDATE. Fire-and-forget: Fehler werden geschluckt.
 *
 * Used by /api/chat and /api/ernaehrungsplan/generieren.
 */
const TOUCH_INTERVAL_MS = 60 * 60 * 1000; // 1 h
const MAX_TRACKED = 50_000; // Leak-Schutz fuer die Throttle-Map
const lastTouch = new Map<string, number>();

export async function touchLastActive(
  supabase: SupabaseClient,
  clerkId: string
): Promise<void> {
  const now = Date.now();
  const prev = lastTouch.get(clerkId) ?? 0;
  if (now - prev < TOUCH_INTERVAL_MS) return; // innerhalb des Fensters -> skip

  lastTouch.set(clerkId, now);
  if (lastTouch.size > MAX_TRACKED) {
    // Map haelt Insertion-Order: aeltesten Eintrag entfernen.
    const oldest = lastTouch.keys().next().value;
    if (oldest !== undefined) lastTouch.delete(oldest);
  }

  try {
    await supabase
      .from("ea_users")
      .update({ last_active_at: new Date().toISOString() })
      .eq("clerk_id", clerkId);
  } catch (err) {
    console.error("[last-active] update failed:", err);
  }
}
