import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { validateBody, consentSchema } from "@/lib/validations";
import { ensureEaUsersRow } from "@/lib/ensure-user";

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createSupabaseAdmin();

  const rawBody = await request.json();
  const validation = validateBody(consentSchema, rawBody);
  if (!validation.success) {
    return NextResponse.json(
      { error: "invalid_input", message: validation.error },
      { status: 400 }
    );
  }
  const { consent, type } = validation.data;
  console.log("[consent POST]", { type, consent, userId });

  // type === "ki" → ea_users.ki_consent
  // type === "review" (or undefined for backwards compat) → ea_profiles.review_consent
  if (type === "ki") {
    // Route through the shared helper so we can never create a row with
    // ki_consent=true but agb_accepted_at=NULL (the classic onboarding
    // ordering bug). If the row doesn't exist yet, the helper inserts a
    // fresh one; if it does, it only patches ki_consent.
    const result = await ensureEaUsersRow(supabase, userId, {
      kiConsent: consent,
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error ?? "ensure_user_failed" },
        { status: 500 }
      );
    }
    return NextResponse.json({ success: true, stage: result.stage });
  }

  const { error } = await supabase
    .from("ea_profiles")
    .update({ review_consent: consent })
    .eq("user_id", userId);

  if (error) {
    console.error("review_consent update error:", {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      clerk_id: userId,
    });
    return NextResponse.json({ error: "internal_error", message: "Einwilligung konnte nicht gespeichert werden." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
