import { createSupabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { session_id, rating, comment } = await request.json();
  if (!session_id || !rating || ![1, -1].includes(Number(rating))) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("ea_feedback")
    .select("id")
    .eq("session_id", session_id)
    .eq("user_id", user.id)
    .limit(1);

  if (existing?.length) {
    return NextResponse.json({ error: "Feedback already given" }, { status: 409 });
  }

  const { error } = await supabase.from("ea_feedback").insert({
    session_id,
    user_id: user.id,
    rating: Number(rating),
    comment: comment?.trim() || null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
