import { createSupabaseAdmin } from "@/lib/supabase/server";

// Credit costs per action
export const CREDIT_COSTS = {
  chat_usage: 1,
  plan_generation: 3,
  review: 3,
} as const;

// Credits granted per plan per month
export const PLAN_CREDITS = {
  free: 10,
  pro: 100,
  pro_plus: 500,
} as const;

export type CreditActionType =
  | "subscription_grant"
  | "topup_purchase"
  | "chat_usage"
  | "plan_generation"
  | "review"
  | "manual_adjustment"
  | "expiry_reset";

interface CreditBalance {
  credits_subscription: number;
  credits_topup: number;
  total: number;
}

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

/**
 * Deduct credits for an action. Subscription credits are consumed first, then top-up.
 * Returns false if insufficient credits.
 */
export async function deductCredits(
  userId: string,
  amount: number,
  type: CreditActionType,
  description?: string
): Promise<boolean> {
  const supabase = createSupabaseAdmin();

  const { data: user } = await supabase
    .from("ea_users")
    .select("credits_subscription, credits_topup")
    .eq("clerk_id", userId)
    .single();

  if (!user) return false;

  const subCredits = user.credits_subscription ?? 0;
  const topupCredits = user.credits_topup ?? 0;
  const total = subCredits + topupCredits;

  if (total < amount) return false;

  // Consume subscription credits first
  const subDeduct = Math.min(subCredits, amount);
  const topupDeduct = amount - subDeduct;

  const newSub = subCredits - subDeduct;
  const newTopup = topupCredits - topupDeduct;

  const { error } = await supabase
    .from("ea_users")
    .update({
      credits_subscription: newSub,
      credits_topup: newTopup,
      updated_at: new Date().toISOString(),
    })
    .eq("clerk_id", userId);

  if (error) return false;

  // Log transaction
  await supabase.from("ea_credit_transactions").insert({
    user_id: userId,
    amount: -amount,
    type,
    description: description || type,
    balance_after: newSub + newTopup,
  });

  return true;
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
