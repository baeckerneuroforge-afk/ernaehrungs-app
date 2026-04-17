import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { validateBody, foodLogSchema } from "@/lib/validations";
import { checkRateLimit, tagebuchLimiter } from "@/lib/rate-limit";

const RATE_LIMIT_MSG = "Zu viele Anfragen. Bitte warte einen Moment.";

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized", message: "Bitte melde dich erneut an." }, { status: 401 });

  const rl = await checkRateLimit(tagebuchLimiter, userId);
  if (!rl.success) {
    return NextResponse.json({ error: "rate_limited", message: RATE_LIMIT_MSG }, { status: 429 });
  }

  const supabase = createSupabaseAdmin();

  const url = new URL(request.url);
  const datumParam = url.searchParams.get("datum");
  if (datumParam && !/^\d{4}-\d{2}-\d{2}$/.test(datumParam)) {
    return NextResponse.json(
      { error: "invalid_date", message: "Datum muss im Format YYYY-MM-DD sein." },
      { status: 400 }
    );
  }
  const datum = datumParam || new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("ea_food_log")
    .select("*")
    .eq("user_id", userId)
    .eq("datum", datum)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[tagebuch] GET db error:", error);
    return NextResponse.json(
      { error: "internal_error", message: "Einträge konnten nicht geladen werden." },
      { status: 500 }
    );
  }
  return NextResponse.json(data || []);
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized", message: "Bitte melde dich erneut an." }, { status: 401 });

  const rl = await checkRateLimit(tagebuchLimiter, userId);
  if (!rl.success) {
    return NextResponse.json({ error: "rate_limited", message: RATE_LIMIT_MSG }, { status: 429 });
  }

  const supabase = createSupabaseAdmin();

  const rawBody = await request.json();
  const validation = validateBody(foodLogSchema, rawBody);
  if (!validation.success) {
    return NextResponse.json(
      { error: "invalid_input", message: validation.error },
      { status: 400 }
    );
  }
  const body = validation.data;

  const { data, error } = await supabase
    .from("ea_food_log")
    .insert({
      user_id: userId,
      mahlzeit_typ: body.mahlzeit_typ,
      beschreibung: body.beschreibung,
      kalorien_geschaetzt: body.kalorien_geschaetzt ?? null,
      protein_g: body.protein_g ?? null,
      carbs_g: body.carbs_g ?? null,
      fat_g: body.fat_g ?? null,
      uhrzeit: body.uhrzeit ?? null,
      source: body.source === "photo" ? "photo" : "manual",
      photo_url: body.photo_url ?? null,
      photo_tip: body.photo_tip ?? null,
      photo_daily_budget_percent: body.photo_daily_budget_percent ?? null,
      datum: body.datum || new Date().toISOString().split("T")[0],
    })
    .select()
    .single();

  if (error) {
    console.error("[api/tagebuch POST] insert failed:", error);
    return NextResponse.json(
      { error: "internal_error", message: "Eintrag konnte nicht gespeichert werden." },
      { status: 500 }
    );
  }
  if (!data?.id) {
    console.error("[api/tagebuch POST] insert returned no id:", data);
    return NextResponse.json(
      { error: "insert returned no row" },
      { status: 500 }
    );
  }
  return NextResponse.json(data);
}
