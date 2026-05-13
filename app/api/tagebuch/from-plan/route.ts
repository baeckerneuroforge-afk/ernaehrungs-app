import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { checkRateLimit, tagebuchLimiter } from "@/lib/rate-limit";
import { hasFeatureAccess, getUpgradeMessage } from "@/lib/feature-gates";
import { getUserPlan } from "@/lib/feature-gates-server";
import { mapPlanMealTypeToTagebuch } from "@/lib/plan-meal-mapping";
import type { WeekPlanData } from "@/types/meal-plan";

const requestSchema = z.object({
  plan_id: z.string().uuid(),
  day_index: z.number().int().min(0).max(30),
  meal_index: z.number().int().min(0).max(10),
});

// "08:00" → "08:00:00" für DB time-Spalte. Postgres akzeptiert beides,
// aber explizite Sekunden vermeiden Casting-Surprises.
function formatTime(time: string | undefined | null): string | null {
  if (!time) return null;
  if (/^\d{2}:\d{2}$/.test(time)) return `${time}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(time)) return time;
  return null;
}

// Plan-Mahlzeit-Makro für DB-Insert: keine Zahl/negativ/NaN → NULL.
// Auf eine Nachkommastelle runden, damit die DB-NUMERIC-Spalte sauber
// gefüllt wird (Tagebuch zeigt eh nur gerundete Werte).
function sanitizeMacroForInsert(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return null;
  return Math.round(v * 10) / 10;
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      { error: "unauthorized", message: "Bitte melde dich erneut an." },
      { status: 401 }
    );
  }

  const rl = await checkRateLimit(tagebuchLimiter, userId);
  if (!rl.success) {
    return NextResponse.json(
      { error: "rate_limited", message: "Zu viele Anfragen. Bitte warte einen Moment." },
      { status: 429 }
    );
  }

  // Feature-Gate: Plan = pro+ (siehe lib/feature-gates.ts).
  const userPlan = await getUserPlan(userId);
  if (!hasFeatureAccess(userPlan, "plan")) {
    return NextResponse.json(
      {
        error: "feature_locked",
        feature: "plan",
        message: getUpgradeMessage("plan"),
        requiredPlan: "pro",
      },
      { status: 403 }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Ungültiger Request-Body." },
      { status: 400 }
    );
  }

  const validation = requestSchema.safeParse(rawBody);
  if (!validation.success) {
    return NextResponse.json(
      {
        error: "invalid_input",
        message: validation.error.issues
          .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
          .join(", "),
      },
      { status: 400 }
    );
  }

  const { plan_id, day_index, meal_index } = validation.data;
  const supabase = createSupabaseAdmin();

  const { data: planRow, error: planErr } = await supabase
    .from("ea_meal_plans")
    .select("id, plan_data, status")
    .eq("id", plan_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (planErr) {
    console.error("[from-plan] plan lookup failed:", planErr);
    return NextResponse.json(
      { error: "internal_error", message: "Plan konnte nicht geladen werden." },
      { status: 500 }
    );
  }
  if (!planRow) {
    return NextResponse.json(
      { error: "plan_not_found", message: "Plan nicht gefunden." },
      { status: 404 }
    );
  }

  const planData = planRow.plan_data as WeekPlanData | null;
  const days = planData?.weekPlan;
  if (!Array.isArray(days) || day_index >= days.length) {
    return NextResponse.json(
      { error: "invalid_day", message: "Plan-Tag nicht gefunden." },
      { status: 400 }
    );
  }

  const day = days[day_index];
  const meals = day?.meals;
  if (!Array.isArray(meals) || meal_index >= meals.length) {
    return NextResponse.json(
      { error: "invalid_meal", message: "Plan-Mahlzeit nicht gefunden." },
      { status: 400 }
    );
  }

  const meal = meals[meal_index];

  const mahlzeit_typ = mapPlanMealTypeToTagebuch(meal.type, meal.time);
  const beschreibung = (meal.name?.trim() || meal.shortDescription?.trim() || "Plan-Mahlzeit").slice(0, 1000);
  const kalorien =
    typeof meal.calories === "number" && meal.calories > 0
      ? Math.round(meal.calories)
      : null;
  const today = new Date().toISOString().split("T")[0];

  // Pro-Meal-Makros aus dem Plan übernehmen wenn sie da sind. Alte
  // Pläne (vor dem Macros-per-Meal-Update) haben keine — dann bleiben
  // die Spalten NULL wie bisher, das UI rendert dann nur Kalorien und
  // der User kann manuell nachtragen.
  const protein_g = sanitizeMacroForInsert(meal.protein);
  const carbs_g = sanitizeMacroForInsert(meal.carbs);
  const fat_g = sanitizeMacroForInsert(meal.fat);

  const { data, error } = await supabase
    .from("ea_food_log")
    .insert({
      user_id: userId,
      mahlzeit_typ,
      beschreibung,
      kalorien_geschaetzt: kalorien,
      protein_g,
      carbs_g,
      fat_g,
      uhrzeit: formatTime(meal.time),
      source: "manual",
      datum: today,
      plan_id,
      plan_meal_ref: `${day_index}:${meal_index}`,
    })
    .select()
    .single();

  if (error) {
    console.error("[from-plan] insert failed:", error);
    return NextResponse.json(
      { error: "internal_error", message: "Eintrag konnte nicht gespeichert werden." },
      { status: 500 }
    );
  }
  if (!data?.id) {
    return NextResponse.json(
      { error: "internal_error", message: "Eintrag konnte nicht gespeichert werden." },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
