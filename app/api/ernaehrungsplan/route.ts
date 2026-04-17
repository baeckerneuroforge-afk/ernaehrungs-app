import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const savePlanSchema = z.object({
  planData: z.record(z.string(), z.unknown()).nullable().optional(),
  parameters: z.record(z.string(), z.unknown()).nullable().optional(),
});

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

  if (error) {
    console.error("[ernaehrungsplan] GET db error:", error);
    return NextResponse.json(
      { error: "internal_error", message: "Pläne konnten nicht geladen werden." },
      { status: 500 }
    );
  }
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let rawBody;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const validation = savePlanSchema.safeParse(rawBody);
  if (!validation.success) {
    return NextResponse.json({ error: "invalid_input", message: validation.error.message }, { status: 400 });
  }

  const { planData, parameters } = validation.data;
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

  if (error) {
    console.error("[ernaehrungsplan] POST db error:", error);
    return NextResponse.json(
      { error: "internal_error", message: "Plan konnte nicht gespeichert werden." },
      { status: 500 }
    );
  }
  return NextResponse.json(data);
}
