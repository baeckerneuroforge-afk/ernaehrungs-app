import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, tagebuchLimiter } from "@/lib/rate-limit";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized", message: "Bitte melde dich erneut an." }, { status: 401 });

  const rl = await checkRateLimit(tagebuchLimiter, userId);
  if (!rl.success) {
    return NextResponse.json(
      { error: "rate_limited", message: "Zu viele Anfragen. Bitte warte einen Moment." },
      { status: 429 }
    );
  }

  const supabase = createSupabaseAdmin();
  const { id } = await params;

  const { error } = await supabase
    .from("ea_food_log")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("[tagebuch/:id] DELETE db error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

// PATCH: erlaubt nur die User-editierbaren Felder. plan_id, plan_meal_ref,
// source, photo_*, datum, created_at, user_id bleiben bewusst außen vor —
// das sind Provenance-/System-Felder, die durch ein Edit nicht plötzlich
// kippen sollen (z.B. Plan-Verbindung erhalten, auch wenn der User Werte
// manuell anpasst).
const patchSchema = z.object({
  mahlzeit_typ: z.enum(["fruehstueck", "mittag", "abend", "snack"]),
  beschreibung: z.string().min(1).max(1000),
  kalorien_geschaetzt: z.number().int().min(0).max(10000).nullable(),
  protein_g: z.number().min(0).max(1000).nullable(),
  carbs_g: z.number().min(0).max(1000).nullable(),
  fat_g: z.number().min(0).max(1000).nullable(),
  uhrzeit: z.string().nullable(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Ungültiger Request-Body." },
      { status: 400 }
    );
  }

  const parsed = patchSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid_input",
        message: parsed.error.issues
          .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
          .join(", "),
      },
      { status: 400 }
    );
  }

  const { id } = await params;
  const supabase = createSupabaseAdmin();

  // "08:00" → "08:00:00" damit Postgres-TIME sauber casted (siehe
  // from-plan-Route, gleiche Logik).
  const uhrzeit = parsed.data.uhrzeit
    ? /^\d{2}:\d{2}$/.test(parsed.data.uhrzeit)
      ? `${parsed.data.uhrzeit}:00`
      : parsed.data.uhrzeit
    : null;

  const { data, error } = await supabase
    .from("ea_food_log")
    .update({
      mahlzeit_typ: parsed.data.mahlzeit_typ,
      beschreibung: parsed.data.beschreibung,
      kalorien_geschaetzt: parsed.data.kalorien_geschaetzt,
      protein_g: parsed.data.protein_g,
      carbs_g: parsed.data.carbs_g,
      fat_g: parsed.data.fat_g,
      uhrzeit,
    })
    .eq("id", id)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("[tagebuch/:id] PATCH db error:", error);
    return NextResponse.json(
      { error: "internal_error", message: "Eintrag konnte nicht aktualisiert werden." },
      { status: 500 }
    );
  }
  if (!data) {
    return NextResponse.json(
      { error: "not_found", message: "Eintrag nicht gefunden." },
      { status: 404 }
    );
  }
  return NextResponse.json(data);
}
