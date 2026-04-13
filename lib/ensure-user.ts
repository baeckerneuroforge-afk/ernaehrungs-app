import type { SupabaseClient } from "@supabase/supabase-js";
import { currentUser } from "@clerk/nextjs/server";

/**
 * Single source of truth for creating / updating the ea_users row during
 * onboarding. Both /api/profile and /api/profile/consent route through
 * this helper so we can never end up with a row that's missing either
 * `agb_accepted_at` or `ki_consent` just because the two endpoints ran
 * in an unexpected order.
 *
 * Rules:
 *  - Row exists → UPDATE only the fields that were passed in. Passing
 *    `agbAcceptedAt` (ISO string) stamps it. Passing `kiConsent` writes
 *    it. Existing values are never wiped.
 *  - Row does not exist → INSERT a fresh row with sensible defaults AND
 *    whatever was passed in. credits_subscription=15, plan=free.
 *
 * Always logs the outcome with a consistent prefix so the Vercel logs
 * can be grepped during incidents.
 */
export async function ensureEaUsersRow(
  supabase: SupabaseClient,
  userId: string,
  fields: {
    agbAcceptedAt?: string | null;
    kiConsent?: boolean;
  }
): Promise<{ ok: boolean; stage: "update" | "insert" | "select"; error?: string }> {
  const user = await currentUser();
  const email =
    user?.emailAddresses?.find((e) => e.id === user?.primaryEmailAddressId)
      ?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    "";
  const fullName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || null;
  const imageUrl = user?.imageUrl || null;

  const { data: existing, error: selectError } = await supabase
    .from("ea_users")
    .select("clerk_id, agb_accepted_at, ki_consent")
    .eq("clerk_id", userId)
    .maybeSingle();

  if (selectError) {
    console.error("[ensureEaUsersRow] select failed", {
      userId,
      code: selectError.code,
      message: selectError.message,
    });
    return { ok: false, stage: "select", error: selectError.message };
  }

  if (existing) {
    const patch: Record<string, unknown> = {
      email,
      name: fullName,
      image_url: imageUrl,
      updated_at: new Date().toISOString(),
    };
    // Only stamp agb_accepted_at on first acceptance — never overwrite an
    // earlier timestamp.
    if (fields.agbAcceptedAt && !existing.agb_accepted_at) {
      patch.agb_accepted_at = fields.agbAcceptedAt;
    }
    if (typeof fields.kiConsent === "boolean") {
      patch.ki_consent = fields.kiConsent;
    }
    const { error: updateError } = await supabase
      .from("ea_users")
      .update(patch)
      .eq("clerk_id", userId);

    if (updateError) {
      console.error("[ensureEaUsersRow] update failed", {
        userId,
        code: updateError.code,
        message: updateError.message,
      });
      return { ok: false, stage: "update", error: updateError.message };
    }
    console.log("[ensureEaUsersRow] update ok", {
      userId,
      stamped_agb: !!patch.agb_accepted_at,
      wrote_ki_consent: typeof fields.kiConsent === "boolean",
    });
    return { ok: true, stage: "update" };
  }

  // No row yet — insert a fresh one with defaults + whatever was passed.
  const insertPayload: Record<string, unknown> = {
    clerk_id: userId,
    email,
    name: fullName,
    image_url: imageUrl,
    subscription_plan: "free",
    subscription_status: "none",
    credits_subscription: 15,
    credits_topup: 0,
    agb_accepted_at: fields.agbAcceptedAt ?? null,
    ki_consent:
      typeof fields.kiConsent === "boolean" ? fields.kiConsent : false,
    updated_at: new Date().toISOString(),
  };
  const { error: insertError } = await supabase
    .from("ea_users")
    .insert(insertPayload);

  if (insertError) {
    console.error("[ensureEaUsersRow] insert failed", {
      userId,
      code: insertError.code,
      message: insertError.message,
      details: insertError.details,
    });
    return { ok: false, stage: "insert", error: insertError.message };
  }
  console.log("[ensureEaUsersRow] insert ok", {
    userId,
    stamped_agb: !!fields.agbAcceptedAt,
    wrote_ki_consent: typeof fields.kiConsent === "boolean",
  });
  return { ok: true, stage: "insert" };
}
