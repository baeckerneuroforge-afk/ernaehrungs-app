import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Checks whether the given user has granted explicit consent to AI processing
 * of their health data (Art. 9 Abs. 2 lit. a DSGVO).
 *
 * Returns true only when ea_users.ki_consent = true.
 */
export async function hasKiConsent(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("ea_users")
    .select("ki_consent")
    .eq("clerk_id", userId)
    .maybeSingle();

  if (error) return false;
  return data?.ki_consent === true;
}

export const KI_CONSENT_MISSING_RESPONSE = {
  error: "ki_consent_missing",
  message:
    "Du hast der KI-Verarbeitung nicht zugestimmt. Einwilligung in den Einstellungen erteilen.",
};
