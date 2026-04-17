import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { hasFeatureAccess, getUpgradeMessage } from "@/lib/feature-gates";
import { getUserPlan } from "@/lib/feature-gates-server";
import { checkRateLimit, messagesLimiter } from "@/lib/rate-limit";
import { NextResponse } from "next/server";
import { z } from "zod";

const RATE_LIMIT_MSG = "Zu viele Anfragen. Bitte warte einen Moment.";

const messageSchema = z.object({
  content: z.string().min(1).max(4000),
});

// GET: user fetches their own messages + replies
export async function GET() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await checkRateLimit(messagesLimiter, userId);
  if (!rl.success) {
    return NextResponse.json({ error: "rate_limited", message: RATE_LIMIT_MSG }, { status: 429 });
  }

  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from("ea_messages")
    .select("id, content, admin_reply, replied_at, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("[messages] GET db error:", error);
    return NextResponse.json(
      { error: "internal_error", message: "Nachrichten konnten nicht geladen werden." },
      { status: 500 }
    );
  }
  return NextResponse.json(data || []);
}

// POST: user sends a new message
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await checkRateLimit(messagesLimiter, userId);
  if (!rl.success) {
    return NextResponse.json({ error: "rate_limited", message: RATE_LIMIT_MSG }, { status: 429 });
  }

  // Feature gate: Janine direkt is Premium only
  const plan = await getUserPlan(userId);
  if (!hasFeatureAccess(plan, "janine_direkt")) {
    return NextResponse.json(
      {
        error: "feature_locked",
        feature: "janine_direkt",
        message: getUpgradeMessage("janine_direkt"),
        requiredPlan: "pro_plus",
      },
      { status: 403 }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = messageSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_input", message: "Nachricht muss zwischen 1 und 4000 Zeichen lang sein." },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdmin();

  const { error } = await supabase.from("ea_messages").insert({
    user_id: userId,
    content: parsed.data.content.trim(),
  });

  if (error) {
    console.error("[messages] POST db error:", error);
    return NextResponse.json(
      { error: "internal_error", message: "Nachricht konnte nicht gesendet werden." },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true });
}
