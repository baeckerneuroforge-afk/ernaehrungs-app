import { auth } from "@clerk/nextjs/server";
import { getCredits, PLAN_CREDITS, isAdminUser } from "@/lib/credits";
import { createSupabaseAdmin } from "@/lib/supabase/server";

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

  const supabase = createSupabaseAdmin();
  const { data: user } = await supabase
    .from("ea_users")
    .select("subscription_plan")
    .eq("clerk_id", userId)
    .single();

  const plan = (user?.subscription_plan || "free") as keyof typeof PLAN_CREDITS;
  const balance = await getCredits(userId);

  return new Response(
    JSON.stringify({
      ...balance,
      plan,
      plan_limit: PLAN_CREDITS[plan] ?? PLAN_CREDITS.free,
      isAdmin: false,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
