import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { validateBody, weightLogSchema } from "@/lib/validations";
import { checkRateLimit, trackerLimiter } from "@/lib/rate-limit";

const RATE_LIMIT_MSG = "Zu viele Anfragen. Bitte warte einen Moment.";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await checkRateLimit(trackerLimiter, userId);
  if (!rl.success) {
    return NextResponse.json({ error: "rate_limited", message: RATE_LIMIT_MSG }, { status: 429 });
  }

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

  const rl = await checkRateLimit(trackerLimiter, userId);
  if (!rl.success) {
    return NextResponse.json({ error: "rate_limited", message: RATE_LIMIT_MSG }, { status: 429 });
  }

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

  // Sync profile.gewicht_kg to the most recent weight log so TDEE
  // calculations (Mifflin-St-Jeor) stay accurate as the user loses/gains.
  const { data: latest } = await supabase
    .from("ea_weight_logs")
    .select("gewicht_kg, gemessen_am")
    .eq("user_id", userId)
    .order("gemessen_am", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest?.gewicht_kg) {
    await supabase
      .from("ea_profiles")
      .update({ gewicht_kg: latest.gewicht_kg })
      .eq("user_id", userId);
  }

  return NextResponse.json(data?.[0], { status: 201 });
}
