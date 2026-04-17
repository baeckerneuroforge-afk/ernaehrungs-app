import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { checkRateLimit, tagebuchLimiter } from "@/lib/rate-limit";

const ALLOWED = ["accurate", "too_low", "too_high"] as const;
type Feedback = (typeof ALLOWED)[number];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await checkRateLimit(tagebuchLimiter, userId);
  if (!rl.success) {
    return NextResponse.json(
      { error: "rate_limited", message: "Zu viele Anfragen. Bitte warte einen Moment." },
      { status: 429 }
    );
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const feedback = body?.feedback as Feedback | null | undefined;

  if (feedback !== null && !ALLOWED.includes(feedback as Feedback)) {
    return NextResponse.json(
      { error: "invalid_feedback", allowed: ALLOWED },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdmin();
  const { error } = await supabase
    .from("ea_food_log")
    .update({ photo_feedback: feedback ?? null })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("[tagebuch/:id/feedback] db error:", error);
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
