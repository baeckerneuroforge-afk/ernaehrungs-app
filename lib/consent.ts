import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Checks whether the given user has granted (a) explicit consent to AI
 * processing of their health data (Art. 9 Abs. 2 lit. a DSGVO) AND (b) has
 * accepted the AGB (terms of service).
 *
 * Both are preconditions for any external LLM call. We fold them into a
 * single query so every LLM route enforces both with one check.
 *
 * Returns true only when ea_users.ki_consent = true AND agb_accepted_at is set.
 */
export async function hasKiConsent(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("ea_users")
    .select("ki_consent, agb_accepted_at")
    .eq("clerk_id", userId)
    .maybeSingle();

  if (error) return false;
  if (data?.ki_consent !== true) return false;
  if (!data?.agb_accepted_at) return false;
  return true;
}

export const KI_CONSENT_MISSING_RESPONSE = {
  error: "ki_consent_missing",
  message:
    "Du hast der KI-Verarbeitung oder den AGB nicht zugestimmt. Einwilligung in den Einstellungen erteilen.",
};
