import "server-only";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import type { SubscriptionPlan } from "@/lib/feature-gates";

/**
 * Fetch the user's current subscription plan. Defaults to "free" if no row.
 * Admins always return "admin" which grants access to every feature.
 * Server-only because it uses the Supabase admin client.
 */
export async function getUserPlan(clerkId: string): Promise<SubscriptionPlan> {
  const supabase = createSupabaseAdmin();

  const { data: roleData } = await supabase
    .from("ea_user_roles")
    .select("role")
    .eq("user_id", clerkId)
    .limit(1);

  if (roleData?.[0]?.role === "admin") return "admin";

  const { data } = await supabase
    .from("ea_users")
    .select("subscription_plan")
    .eq("clerk_id", clerkId)
    .single();
  return (data?.subscription_plan as SubscriptionPlan) || "free";
}
