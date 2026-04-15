import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/feature-gates-server";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdmin();
  const plan = await getUserPlan(userId);

  // Plan-based limits: free=5 sessions (30d), pro=20 sessions (90d), pro_plus/admin=unlimited
  const sessionLimit = plan === "free" ? 5 : plan === "pro" ? 20 : 200;
  const daysLimit = plan === "free" ? 30 : plan === "pro" ? 90 : null;
  const cutoffDate = daysLimit
    ? new Date(Date.now() - daysLimit * 24 * 60 * 60 * 1000).toISOString()
    : null;

  // Query the sessions view
  let query = supabase
    .from("ea_conversation_sessions")
    .select("session_id, title, started_at, last_message_at, message_count")
    .eq("user_id", userId)
    .order("last_message_at", { ascending: false })
    .limit(sessionLimit);

  if (cutoffDate) {
    query = query.gte("last_message_at", cutoffDate);
  }

  const { data, error } = await query;

  if (error) {
    // Fallback if view doesn't exist yet (migration not run)
    // Group manually from conversations
    const { data: convos } = await supabase
      .from("ea_conversations")
      .select("session_id, content, role, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (!convos?.length) return NextResponse.json([]);

    const sessions: Record<string, {
      session_id: string;
      title: string | null;
      started_at: string;
      last_message_at: string;
      message_count: number;
    }> = {};

    for (const c of convos) {
      if (!sessions[c.session_id]) {
        sessions[c.session_id] = {
          session_id: c.session_id,
          title: c.role === "user" ? c.content.slice(0, 60) : null,
          started_at: c.created_at,
          last_message_at: c.created_at,
          message_count: 0,
        };
      }
      sessions[c.session_id].message_count++;
      sessions[c.session_id].last_message_at = c.created_at;
      if (!sessions[c.session_id].title && c.role === "user") {
        sessions[c.session_id].title = c.content.slice(0, 60);
      }
    }

    let sorted = Object.values(sessions)
      .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime());

    if (cutoffDate) {
      sorted = sorted.filter((s) => s.last_message_at >= cutoffDate);
    }

    return NextResponse.json(sorted.slice(0, sessionLimit));
  }

  // Attach plan metadata so client can show upgrade hints
  return NextResponse.json({
    sessions: data || [],
    meta: { plan, sessionLimit, daysLimit },
  });
}
