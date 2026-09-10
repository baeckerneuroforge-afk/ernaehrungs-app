import { auth } from "@clerk/nextjs/server";
import { getCredits, PLAN_CREDITS, isAdminUser } from "@/lib/credits";
import { getUserPlan } from "@/lib/feature-gates-server";
import type { SubscriptionPlan } from "@/lib/feature-gates";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  // Admins bypass the credit system entirely
  if (await isAdminUser(userId)) {
    return new Response(
      JSON.stringify({
        total: -1,
        credits_subscription: -1,
        credits_topup: 0,
        plan: "admin",
        plan_limit: -1,
        isAdmin: true,
      }),
      { headers: { "Content-Type": "application/json" } }
    );
  }

  // Align with feature gates: only active|trialing keep paid plan label for UI.
  // past_due/canceled would otherwise show as pro/pro_plus and unlock client isPremiumChat.
  const gatedPlan = await getUserPlan(userId);
  const planKey = (
    gatedPlan === "admin" ? "free" : gatedPlan
  ) as keyof typeof PLAN_CREDITS;
  // getUserPlan never returns admin here (handled above); still normalize.
  const plan: SubscriptionPlan = gatedPlan === "admin" ? "admin" : gatedPlan;
  const balance = await getCredits(userId);

  return new Response(
    JSON.stringify({
      ...balance,
      plan,
      plan_limit: PLAN_CREDITS[planKey] ?? PLAN_CREDITS.free,
      isAdmin: false,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
