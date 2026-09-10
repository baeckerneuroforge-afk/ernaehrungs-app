import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { checkRateLimit, trackerLimiter } from "@/lib/rate-limit";
import { validateBody, zieleCreateSchema } from "@/lib/validations";

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
    .from("ea_ziele")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) { console.error("[tracker/ziele] db error:", error); return NextResponse.json({ error: "internal_error" }, { status: 500 }); }
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
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  const validation = validateBody(zieleCreateSchema, rawBody);
  if (!validation.success) {
    return NextResponse.json({ error: "invalid_input", message: validation.error }, { status: 400 });
  }
  const body = validation.data;

  const { data, error } = await supabase
    .from("ea_ziele")
    .insert({
      user_id: userId,
      typ: body.typ,
      beschreibung: body.beschreibung,
      zielwert: body.zielwert ?? null,
      startwert: body.startwert ?? null,
      einheit: body.einheit ?? null,
      zieldatum: body.zieldatum ?? null,
    })
    .select()
    .limit(1);

  if (error) { console.error("[tracker/ziele] db error:", error); return NextResponse.json({ error: "internal_error" }, { status: 500 }); }
  return NextResponse.json(data?.[0], { status: 201 });
}
