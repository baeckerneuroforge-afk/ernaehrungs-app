import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { validateBody, weightLogSchema } from "@/lib/validations";
import { checkRateLimit, trackerLimiter } from "@/lib/rate-limit";

const RATE_LIMIT_MSG = "Zu viele Anfragen. Bitte warte einen Moment.";

export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized", message: "Bitte melde dich erneut an." }, { status: 401 });

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

  if (error) { console.error("[tracker/gewicht] db error:", error); return NextResponse.json({ error: "internal_error" }, { status: 500 }); }
  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized", message: "Bitte melde dich erneut an." }, { status: 401 });

  const rl = await checkRateLimit(trackerLimiter, userId);
  if (!rl.success) {
    return NextResponse.json({ error: "rate_limited", message: RATE_LIMIT_MSG }, { status: 429 });
  }

  const supabase = createSupabaseAdmin();

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Ungültiger Request-Body." },
      { status: 400 }
    );
  }
  const validation = validateBody(weightLogSchema, rawBody);
  if (!validation.success) {
    console.warn("[tracker/gewicht] validation failed", {
      userId,
      err: validation.error,
      received: rawBody,
    });
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

  if (error) {
    console.error("[tracker/gewicht] upsert db error:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return NextResponse.json(
      { error: "internal_error", message: "Gewicht konnte nicht gespeichert werden." },
      { status: 500 }
    );
  }

  // Profil-Sync: der jüngste Eintrag speist profile.gewicht_kg, damit
  // Mifflin-St-Jeor / TDEE aktuell bleiben. Fail-soft — wenn das Update
  // schiefgeht, sollen wir den bereits-erfolgreichen Weight-Insert nicht
  // kippen. Fehler nur loggen, Client bekommt den 201.
  try {
    const { data: latest } = await supabase
      .from("ea_weight_logs")
      .select("gewicht_kg, gemessen_am")
      .eq("user_id", userId)
      .order("gemessen_am", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest?.gewicht_kg) {
      const { error: profErr } = await supabase
        .from("ea_profiles")
        .update({ gewicht_kg: latest.gewicht_kg })
        .eq("user_id", userId);
      if (profErr) {
        console.warn("[tracker/gewicht] profile sync failed (non-fatal):", profErr.message);
      }
    }
  } catch (syncErr) {
    console.warn("[tracker/gewicht] profile sync threw (non-fatal):", syncErr);
  }

  return NextResponse.json(data?.[0] ?? null, { status: 201 });
}
