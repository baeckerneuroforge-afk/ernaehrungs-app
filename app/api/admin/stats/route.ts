import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { logAdminAction } from "@/lib/admin-audit";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdmin();

  // Check admin role
  const { data: roleData } = await supabase
    .from("ea_user_roles")
    .select("role")
    .eq("user_id", userId)
    .limit(1);

  if (roleData?.[0]?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await logAdminAction({
    adminId: userId,
    action: "view_dashboard_stats",
    resourceType: "stats",
  });

  // Aggregate stats
  const [profiles, conversations, mealPlans, documents] = await Promise.all([
    supabase.from("ea_profiles").select("id", { count: "exact", head: true }),
    supabase.from("ea_conversations").select("id", { count: "exact", head: true }),
    supabase.from("ea_meal_plans").select("id", { count: "exact", head: true }),
    supabase.from("ea_documents").select("id", { count: "exact", head: true }),
  ]);

  // Recent conversations (last 7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const { count: weekConversations } = await supabase
    .from("ea_conversations")
    .select("id", { count: "exact", head: true })
    .gte("created_at", weekAgo.toISOString())
    .eq("role", "user");

  // Today's conversations
  const today = new Date().toISOString().split("T")[0];
  const { count: todayConversations } = await supabase
    .from("ea_conversations")
    .select("id", { count: "exact", head: true })
    .gte("created_at", today)
    .eq("role", "user");

  return NextResponse.json({
    total_users: profiles.count || 0,
    total_messages: conversations.count || 0,
    total_meal_plans: mealPlans.count || 0,
    total_documents: documents.count || 0,
    conversations_today: todayConversations || 0,
    conversations_week: weekConversations || 0,
  });
}
