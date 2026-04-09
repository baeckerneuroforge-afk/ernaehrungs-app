import "server-only";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import type { SubscriptionPlan } from "@/lib/feature-gates";

/**
 * Fetch the user's current subscription plan. Defaults to "free" if no row.
 * Server-only because it uses the Supabase admin client.
 */
export async function getUserPlan(clerkId: string): Promise<SubscriptionPlan> {
  const supabase = createSupabaseAdmin();
  const { data } = await supabase
    .from("ea_users")
    .select("subscription_plan")
    .eq("clerk_id", clerkId)
    .single();
  return (data?.subscription_plan as SubscriptionPlan) || "free";
}
