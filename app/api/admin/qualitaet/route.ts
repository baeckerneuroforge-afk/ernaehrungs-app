import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  // Auth + admin role check
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdmin();

  const { data: roleData } = await supabase
    .from("ea_user_roles")
    .select("role")
    .eq("user_id", userId)
    .limit(1);

  if (roleData?.[0]?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createSupabaseAdmin();

  // Get profiles that have given review consent
  const { data: profiles } = await admin
    .from("ea_profiles")
    .select("user_id, name")
    .eq("review_consent", true);

  if (!profiles?.length) return NextResponse.json([]);

  const consentedUserIds = profiles.map((p) => p.user_id);
  const profileByUserId: Record<string, string> = Object.fromEntries(
    profiles.map((p) => [p.user_id, p.name || "Unbekannt"])
  );

  // Get conversations from consented users
  const { data: conversations, error } = await admin
    .from("ea_conversations")
    .select("id, session_id, role, content, created_at, user_id")
    .in("user_id", consentedUserIds)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Get all feedback
  const { data: feedbackRows } = await admin
    .from("ea_feedback")
    .select("session_id, rating, comment, created_at");

  const feedbackBySession: Record<string, { rating: number; comment: string | null }> = {};
  for (const f of feedbackRows || []) {
    feedbackBySession[f.session_id] = { rating: f.rating, comment: f.comment };
  }

  // Group into sessions
  const sessions: Record<
    string,
    {
      session_id: string;
      user_name: string;
      messages: Array<{ role: string; content: string; created_at: string }>;
      feedback: { rating: number; comment: string | null } | null;
      last_message_at: string;
    }
  > = {};

  for (const msg of conversations || []) {
    if (!sessions[msg.session_id]) {
      sessions[msg.session_id] = {
        session_id: msg.session_id,
        user_name: profileByUserId[msg.user_id] || "Unbekannt",
        messages: [],
        feedback: feedbackBySession[msg.session_id] || null,
        last_message_at: msg.created_at,
      };
    }
    sessions[msg.session_id].messages.push({
      role: msg.role,
      content: msg.content,
      created_at: msg.created_at,
    });
    sessions[msg.session_id].last_message_at = msg.created_at;
  }

  const sorted = Object.values(sessions).sort(
    (a, b) =>
      new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime()
  );

  return NextResponse.json(sorted);
}
