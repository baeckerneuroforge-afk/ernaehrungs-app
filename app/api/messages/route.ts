import { createSupabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// GET: user fetches their own messages + replies
export async function GET() {
  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("ea_messages")
    .select("id, content, admin_reply, replied_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

// POST: user sends a new message
export async function POST(request: Request) {
  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { content } = await request.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: "Nachricht darf nicht leer sein" }, { status: 400 });
  }

  const { error } = await supabase.from("ea_messages").insert({
    user_id: user.id,
    content: content.trim(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
