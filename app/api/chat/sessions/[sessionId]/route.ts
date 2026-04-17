import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdmin();
  const { sessionId } = await params;

  const { data, error } = await supabase
    .from("ea_conversations")
    .select("id, role, content, created_at")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[chat/sessions/:id] db error:", error);
    return NextResponse.json(
      { error: "internal_error", message: "Session konnte nicht geladen werden." },
      { status: 500 }
    );
  }
  return NextResponse.json(data || []);
}
