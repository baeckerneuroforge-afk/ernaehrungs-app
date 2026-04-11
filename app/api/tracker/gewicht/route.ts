import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { validateBody, weightLogSchema } from "@/lib/validations";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("ea_weight_logs")
    .select("*")
    .eq("user_id", userId)
    .order("gemessen_am", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdmin();

  const rawBody = await request.json();
  const validation = validateBody(weightLogSchema, rawBody);
  if (!validation.success) {
    return NextResponse.json(
      { error: "invalid_input", message: validation.error },
      { status: 400 }
    );
  }
  const { gewicht_kg, notiz, gemessen_am } = validation.data;

  const { data, error } = await supabase
    .from("ea_weight_logs")
    .upsert(
      {
        user_id: userId,
        gewicht_kg,
        notiz: notiz || null,
        gemessen_am: gemessen_am || new Date().toISOString().split("T")[0],
      },
      { onConflict: "user_id,gemessen_am" }
    )
    .select()
    .limit(1);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data?.[0], { status: 201 });
}
