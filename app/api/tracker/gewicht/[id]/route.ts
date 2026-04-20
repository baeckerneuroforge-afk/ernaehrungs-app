import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { checkRateLimit, trackerLimiter } from "@/lib/rate-limit";
import { validateBody, weightLogSchema } from "@/lib/validations";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized", message: "Bitte melde dich erneut an." }, { status: 401 });

  const rl = await checkRateLimit(trackerLimiter, userId);
  if (!rl.success) {
    return NextResponse.json(
      { error: "rate_limited", message: "Zu viele Anfragen. Bitte warte einen Moment." },
      { status: 429 }
    );
  }

  const supabase = createSupabaseAdmin();

  const { error } = await supabase
    .from("ea_weight_logs")
    .delete()
    .eq("id", params.id)
    .eq("user_id", userId);

  if (error) {
    console.error("[tracker/gewicht/:id] db error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized", message: "Bitte melde dich erneut an." }, { status: 401 });

  const rl = await checkRateLimit(trackerLimiter, userId);
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
  const validation = validateBody(weightLogSchema, rawBody);
  if (!validation.success) {
    console.warn("[tracker/gewicht/:id] PATCH validation failed", {
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

  const supabase = createSupabaseAdmin();

  // Ownership-Check via doppelte .eq auf user_id + id. Ein User kann nur
  // seine eigenen Einträge editieren.
  const { data, error } = await supabase
    .from("ea_weight_logs")
    .update({
      gewicht_kg,
      notiz: notiz || null,
      ...(gemessen_am ? { gemessen_am } : {}),
    })
    .eq("id", params.id)
    .eq("user_id", userId)
    .select()
    .limit(1);

  if (error) {
    console.error("[tracker/gewicht/:id] PATCH db error:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return NextResponse.json(
      { error: "internal_error", message: "Eintrag konnte nicht aktualisiert werden." },
      { status: 500 }
    );
  }
  if (!data?.length) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // Profil-Sync: fail-soft, analog zum POST-Handler.
  try {
    const { data: latest } = await supabase
      .from("ea_weight_logs")
      .select("gewicht_kg")
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
        console.warn("[tracker/gewicht/:id] profile sync failed (non-fatal):", profErr.message);
      }
    }
  } catch (syncErr) {
    console.warn("[tracker/gewicht/:id] profile sync threw (non-fatal):", syncErr);
  }

  return NextResponse.json(data[0]);
}
