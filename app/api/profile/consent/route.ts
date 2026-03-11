import { createSupabaseServer } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { consent } = await request.json();
  if (typeof consent !== "boolean") {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { error } = await supabase
    .from("ea_profiles")
    .update({ review_consent: consent })
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
