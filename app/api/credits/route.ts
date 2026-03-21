import { auth } from "@clerk/nextjs/server";
import { getCredits, PLAN_CREDITS } from "@/lib/credits";
import { createSupabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
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
    }),
    { headers: { "Content-Type": "application/json" } }
  );
}
