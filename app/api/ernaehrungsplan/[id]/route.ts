import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("ea_meal_plans")
    .select("*")
    .eq("id", params.id)
    .eq("user_id", userId)
    .limit(1);

  if (error) {
    console.error("[ernaehrungsplan/:id] GET db error:", error);
    return NextResponse.json(
      { error: "internal_error", message: "Plan konnte nicht geladen werden." },
      { status: 500 }
    );
  }
  if (!data?.length) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data[0]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdmin();

  const { error } = await supabase
    .from("ea_meal_plans")
    .delete()
    .eq("id", params.id)
    .eq("user_id", userId);

  if (error) {
    console.error("[ernaehrungsplan/:id] DELETE db error:", error);
    return NextResponse.json(
      { error: "internal_error", message: "Plan konnte nicht gelöscht werden." },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true });
}
