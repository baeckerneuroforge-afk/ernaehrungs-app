import { createSupabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: roleData } = await supabase
    .from("ea_user_roles")
    .select("role")
    .eq("user_id", user.id)
    .limit(1);

  if (roleData?.[0]?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1");
  const limit = 30;
  const offset = (page - 1) * limit;

  // Get user messages (anonymized)
  const { data: questions, count } = await supabase
    .from("ea_conversations")
    .select("id, content, session_id, created_at", { count: "exact" })
    .eq("role", "user")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (!questions?.length) {
    return NextResponse.json({ questions: [], total: 0, page, pages: 0 });
  }

  // Fetch the matching assistant replies for these sessions in one query
  const sessionIds = questions.map((q) => q.session_id);
  const { data: replies } = await supabase
    .from("ea_conversations")
    .select("content, session_id, created_at")
    .eq("role", "assistant")
    .in("session_id", sessionIds)
    .order("created_at", { ascending: true });

  // Build map: session_id -> all assistant messages (asc)
  const repliesBySession: Record<string, Array<{ content: string; created_at: string }>> = {};
  for (const r of replies || []) {
    if (!repliesBySession[r.session_id]) repliesBySession[r.session_id] = [];
    repliesBySession[r.session_id].push({ content: r.content, created_at: r.created_at });
  }

  // Match each question to the first assistant message that came after it
  const questionsWithReplies = questions.map((q) => {
    const sessionReplies = repliesBySession[q.session_id] || [];
    const reply = sessionReplies.find((r) => r.created_at > q.created_at) || null;
    return {
      ...q,
      ai_reply: reply?.content ?? null,
    };
  });

  return NextResponse.json({
    questions: questionsWithReplies,
    total: count || 0,
    page,
    pages: Math.ceil((count || 0) / limit),
  });
}
