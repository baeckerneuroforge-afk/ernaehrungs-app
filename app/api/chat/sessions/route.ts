import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdmin();

  // Query the sessions view
  const { data, error } = await supabase
    .from("ea_conversation_sessions")
    .select("session_id, title, started_at, last_message_at, message_count")
    .eq("user_id", userId)
    .order("last_message_at", { ascending: false })
    .limit(50);

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

    const sorted = Object.values(sessions)
      .sort((a, b) => new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime())
      .slice(0, 50);

    return NextResponse.json(sorted);
  }

  return NextResponse.json(data || []);
}
