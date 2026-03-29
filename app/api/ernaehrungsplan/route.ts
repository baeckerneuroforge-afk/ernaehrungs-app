import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("ea_meal_plans")
    .select("id, titel, zeitraum, created_at, plan_data, parameters, status")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { planData, parameters } = await request.json();

  const supabase = createSupabaseAdmin();

  const titel = `7-Tage-Plan vom ${new Date().toLocaleDateString("de-DE")}`;

  const { data, error } = await supabase
    .from("ea_meal_plans")
    .insert({
      user_id: userId,
      titel,
      zeitraum: "7 Tage",
      plan_data: planData,
      parameters,
      status: "active",
    })
    .select("id, titel")
    .single();

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
