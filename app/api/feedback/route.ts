import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { checkRateLimit, feedbackLimiter } from "@/lib/rate-limit";
import { z } from "zod";

const feedbackSchema = z.object({
  session_id: z.string().min(1).max(128),
  rating: z.number().int().refine((v) => v === 1 || v === -1, {
    message: "rating must be 1 or -1",
  }),
  comment: z.string().max(2000).optional(),
});

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await checkRateLimit(feedbackLimiter, userId);
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
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = feedbackSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", message: "Ungültige Feedback-Daten." },
      { status: 400 }
    );
  }
  const { session_id, rating, comment } = parsed.data;

  const supabase = createSupabaseAdmin();

  const { data: existing } = await supabase
    .from("ea_feedback")
    .select("id")
    .eq("session_id", session_id)
    .eq("user_id", userId)
    .limit(1);

  if (existing?.length) {
    return NextResponse.json({ error: "Feedback already given" }, { status: 409 });
  }

  const { error } = await supabase.from("ea_feedback").insert({
    session_id,
    user_id: userId,
    rating,
    comment: comment?.trim() || null,
  });

  if (error) {
    console.error("[feedback] db error:", error);
    return NextResponse.json(
      { error: "internal_error", message: "Feedback konnte nicht gespeichert werden." },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true });
}
