import { cache } from "react";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { emailTemplates } from "@/lib/email-templates";

// Constants live in lib/plans.ts so client components can read them without
// pulling server-only deps (resend, supabase admin) into the client bundle.
export {
  CREDIT_COSTS,
  PLAN_CREDITS,
  PLAN_PRICES,
  PLAN_LABELS,
} from "@/lib/plans";

export type CreditActionType =
  | "subscription_grant"
  | "topup_purchase"
  | "chat_usage"
  | "chat_usage_premium"
  | "chat_image"
  | "plan_generation"
  | "review"
  | "foto_analysis"
  | "monthly_report"
  | "smart_log"
  | "csv_import"
  | "manual_adjustment"
  | "expiry_reset"
  | "refund";

interface CreditBalance {
  credits_subscription: number;
  credits_topup: number;
  total: number;
}

/**
 * Check whether a user has the admin role. Admins bypass the credit system.
 */
// Per-Request memoisiert (React cache): im Chat-Request wird der Admin-Status
// sonst 3-5x neu aus ea_user_roles gelesen (deduct/refundCredits, RAG-Marker).
export const isAdminUser = cache(async (userId: string): Promise<boolean> => {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("ea_user_roles")
    .select("role")
    .eq("user_id", userId)
    .limit(1);
  return data?.[0]?.role === "admin";
});

/**
 * Get current credit balance for a user.
 */
export async function getCredits(userId: string): Promise<CreditBalance> {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("ea_users")
    .select("credits_subscription, credits_topup")
    .eq("clerk_id", userId)
    .single();

  const sub = data?.credits_subscription ?? 0;
  const topup = data?.credits_topup ?? 0;
  return { credits_subscription: sub, credits_topup: topup, total: sub + topup };
}

/** Result of a credit deduction — includes which buckets were drained for accurate refunds. */
export type DeductCreditsResult = {
  ok: boolean;
  fromSub: number;
  fromTopup: number;
};

/**
 * Deduct credits for an action. Subscription credits are consumed first, then top-up.
 * Returns `{ ok: false }` if insufficient credits.
 */
export async function deductCredits(
  userId: string,
  amount: number,
  type: CreditActionType,
  description?: string
): Promise<DeductCreditsResult> {
  const supabase = createSupabaseAdmin();
  const fail: DeductCreditsResult = { ok: false, fromSub: 0, fromTopup: 0 };

  // Admins have unlimited credits — skip the deduction entirely.
  if (await isAdminUser(userId)) return { ok: true, fromSub: 0, fromTopup: 0 };

  // Try atomic RPC first (race-condition safe). Falls back to
  // SELECT-then-UPDATE if the RPC doesn't exist yet (migration not run).
  let newSub: number;
  let newTopup: number;
  let fromSub: number;
  let fromTopup: number;

  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    "deduct_credits_atomic",
    { p_clerk_id: userId, p_amount: amount }
  );

  if (!rpcError && rpcResult) {
    const result = typeof rpcResult === "string" ? JSON.parse(rpcResult) : rpcResult;
    if (!result.success) return fail;
    newSub = result.new_sub;
    newTopup = result.new_topup;
    // Prefer explicit fields when migration returns them; else infer sub-first.
    if (typeof result.sub_deducted === "number" && typeof result.topup_deducted === "number") {
      fromSub = result.sub_deducted;
      fromTopup = result.topup_deducted;
    } else {
      // Cannot know exact split without old balances — assume sub-first up to amount.
      fromSub = amount;
      fromTopup = 0;
    }
  } else {
    // Fallback: non-atomic path (for dev / before migration is run)
    if (rpcError) {
      console.warn("[credits] RPC deduct_credits_atomic not available, using fallback:", rpcError.message);
    }

    const { data: user } = await supabase
      .from("ea_users")
      .select("credits_subscription, credits_topup")
      .eq("clerk_id", userId)
      .single();

    if (!user) return fail;

    const subCredits = user.credits_subscription ?? 0;
    const topupCredits = user.credits_topup ?? 0;
    if (subCredits + topupCredits < amount) return fail;

    fromSub = Math.min(subCredits, amount);
    fromTopup = amount - fromSub;
    newSub = subCredits - fromSub;
    newTopup = topupCredits - fromTopup;

    const { error } = await supabase
      .from("ea_users")
      .update({
        credits_subscription: newSub,
        credits_topup: newTopup,
        updated_at: new Date().toISOString(),
      })
      .eq("clerk_id", userId);

    if (error) return fail;
  }

  // Log transaction
  await supabase.from("ea_credit_transactions").insert({
    user_id: userId,
    amount: -amount,
    type,
    description: description || type,
    balance_after: newSub + newTopup,
  });

  // Low-credit warning email (fire-and-forget, throttled 1/24h).
  // Honors notification_preferences.credit_warning_email.enabled when set.
  const remaining = newSub + newTopup;
  if (remaining <= 3 && remaining >= 0) {
    const { data: userData } = await supabase
      .from("ea_users")
      .select("email, name, last_credit_warning_at, notification_preferences")
      .eq("clerk_id", userId)
      .single();

    const prefs = userData?.notification_preferences as
      | { credit_warning_email?: { enabled?: boolean } }
      | null;
    const emailEnabled = prefs?.credit_warning_email?.enabled !== false;

    if (userData?.email && emailEnabled) {
      const lastWarn = userData.last_credit_warning_at
        ? new Date(userData.last_credit_warning_at).getTime()
        : 0;
      if (Date.now() - lastWarn > 24 * 60 * 60 * 1000) {
        const template = emailTemplates.creditsLow(userData.name || "dort", remaining);
        void sendEmail({ to: userData.email, subject: template.subject, html: template.html });
        void supabase
          .from("ea_users")
          .update({ last_credit_warning_at: new Date().toISOString() })
          .eq("clerk_id", userId);
      }
    }
  }

  return { ok: true, fromSub, fromTopup };
}

/**
 * Refund credits after a failed LLM call. Restores the same buckets that were
 * debited when `split` is provided; otherwise falls back to subscription bucket.
 */
export async function refundCredits(
  userId: string,
  amount: number,
  reason: string,
  split?: { fromSub: number; fromTopup: number }
): Promise<void> {
  const supabase = createSupabaseAdmin();

  // Admins were never charged — nothing to refund.
  if (await isAdminUser(userId)) return;

  const fromSub = split?.fromSub ?? amount;
  const fromTopup = split?.fromTopup ?? 0;
  const total = fromSub + fromTopup;
  if (total <= 0) return;

  // Prefer two atomic adds when both buckets need restoration.
  async function addBucket(
    bucket: "credits_subscription" | "credits_topup",
    n: number
  ): Promise<boolean> {
    if (n <= 0) return true;
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      "add_credits_atomic",
      {
        p_clerk_id: userId,
        p_amount: n,
        p_bucket: bucket,
        p_type: "refund",
        p_description: `Erstattung: ${reason}`,
      }
    );
    if (!rpcError && rpcResult) {
      const result = typeof rpcResult === "string" ? JSON.parse(rpcResult) : rpcResult;
      if (result.success || result.reason === "user_not_found") return true;
    }
    return false;
  }

  // Only fall back for buckets the RPC did not restore — otherwise a partial
  // success (sub OK, topup fail) would double-credit the successful bucket.
  const needFallbackSub =
    fromSub > 0 && !(await addBucket("credits_subscription", fromSub));
  const needFallbackTopup =
    fromTopup > 0 && !(await addBucket("credits_topup", fromTopup));
  if (!needFallbackSub && !needFallbackTopup) return;

  const fallbackSub = needFallbackSub ? fromSub : 0;
  const fallbackTopup = needFallbackTopup ? fromTopup : 0;
  const fallbackTotal = fallbackSub + fallbackTopup;
  if (fallbackTotal <= 0) return;

  // Fallback: non-atomic read-then-write (dev / before migration is run).
  const { data: user } = await supabase
    .from("ea_users")
    .select("credits_subscription, credits_topup")
    .eq("clerk_id", userId)
    .single();

  if (!user) return;

  const newSub = (user.credits_subscription ?? 0) + fallbackSub;
  const newTopup = (user.credits_topup ?? 0) + fallbackTopup;

  await supabase
    .from("ea_users")
    .update({
      credits_subscription: newSub,
      credits_topup: newTopup,
      updated_at: new Date().toISOString(),
    })
    .eq("clerk_id", userId);

  await supabase.from("ea_credit_transactions").insert({
    user_id: userId,
    amount: fallbackTotal,
    type: "refund",
    description: `Erstattung: ${reason}`,
    balance_after: newSub + newTopup,
  });
}

/**
 * Add credits (for top-up purchases or manual adjustments).
 */
export async function addCredits(
  userId: string,
  amount: number,
  type: CreditActionType,
  description?: string
): Promise<void> {
  const supabase = createSupabaseAdmin();

  const bucket = type === "topup_purchase" ? "credits_topup" : "credits_subscription";

  // Atomic path: increment the bucket + log the transaction in one tx.
  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    "add_credits_atomic",
    {
      p_clerk_id: userId,
      p_amount: amount,
      p_bucket: bucket,
      p_type: type,
      p_description: description || type,
    }
  );
  if (!rpcError && rpcResult) {
    const result = typeof rpcResult === "string" ? JSON.parse(rpcResult) : rpcResult;
    if (result.success || result.reason === "user_not_found") return;
  }
  if (rpcError) {
    console.warn("[credits] add_credits_atomic unavailable, fallback:", rpcError.message);
  }

  // Fallback: non-atomic read-then-write (dev / before migration is run).
  const { data: user } = await supabase
    .from("ea_users")
    .select("credits_subscription, credits_topup")
    .eq("clerk_id", userId)
    .single();

  if (!user) return;

  const current = user[bucket] ?? 0;
  const newVal = current + amount;

  await supabase
    .from("ea_users")
    .update({ [bucket]: newVal, updated_at: new Date().toISOString() })
    .eq("clerk_id", userId);

  const otherBucket = bucket === "credits_topup" ? "credits_subscription" : "credits_topup";
  const otherVal = user[otherBucket] ?? 0;

  await supabase.from("ea_credit_transactions").insert({
    user_id: userId,
    amount,
    type,
    description: description || type,
    balance_after: newVal + otherVal,
  });
}

/**
 * Reset subscription credits (called on billing cycle renewal).
 * Sets subscription credits to plan allowance, does NOT touch top-up credits.
 */
export async function resetSubscriptionCredits(
  userId: string,
  planCredits: number
): Promise<void> {
  const supabase = createSupabaseAdmin();

  // Atomic path: set subscription bucket + log expiry/grant in one tx.
  const { data: rpcResult, error: rpcError } = await supabase.rpc(
    "reset_subscription_credits_atomic",
    { p_clerk_id: userId, p_plan_credits: planCredits }
  );
  if (!rpcError && rpcResult) {
    const result = typeof rpcResult === "string" ? JSON.parse(rpcResult) : rpcResult;
    if (result.success || result.reason === "user_not_found") return;
  }
  if (rpcError) {
    console.warn("[credits] reset_subscription_credits_atomic unavailable, fallback:", rpcError.message);
  }

  // Fallback: non-atomic read-then-write (dev / before migration is run).
  const { data: user } = await supabase
    .from("ea_users")
    .select("credits_subscription, credits_topup")
    .eq("clerk_id", userId)
    .single();

  if (!user) return;

  const oldSub = user.credits_subscription ?? 0;
  const topup = user.credits_topup ?? 0;

  await supabase
    .from("ea_users")
    .update({
      credits_subscription: planCredits,
      credits_reset_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("clerk_id", userId);

  // Log expiry of old credits if any remained
  if (oldSub > 0) {
    await supabase.from("ea_credit_transactions").insert({
      user_id: userId,
      amount: -oldSub,
      type: "expiry_reset",
      description: `Monatliches Reset: ${oldSub} Abo-Credits verfallen`,
      balance_after: planCredits + topup,
    });
  }

  // Log new grant
  await supabase.from("ea_credit_transactions").insert({
    user_id: userId,
    amount: planCredits,
    type: "subscription_grant",
    description: `Monatliches Guthaben: ${planCredits} Credits`,
    balance_after: planCredits + topup,
  });
}
