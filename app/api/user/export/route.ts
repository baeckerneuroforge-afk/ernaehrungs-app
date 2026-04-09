import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createSupabaseAdmin();

  const tables = [
    "ea_profiles",
    "ea_food_log",
    "ea_weight_logs",
    "ea_conversations",
    "ea_meal_plans",
    "ea_ziele",
    "ea_credit_transactions",
    "ea_messages",
    "ea_feedback",
  ] as const;

  const results: Record<string, unknown> = {};

  await Promise.all(
    tables.map(async (table) => {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("user_id", userId);
      results[table] = error ? { error: error.message } : data || [];
    })
  );

  // Account record (ea_users)
  const { data: userRow } = await supabase
    .from("ea_users")
    .select("*")
    .eq("clerk_id", userId)
    .maybeSingle();
  results["ea_users"] = userRow || null;

  const payload = {
    exportedAt: new Date().toISOString(),
    userId,
    data: results,
  };

  const filename = `ernaehrungsberatung-export-${new Date()
    .toISOString()
    .slice(0, 10)}.json`;

  return new Response(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
