import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { checkRateLimit, trackerLimiter } from "@/lib/rate-limit";
import { validateBody, zieleUpdateSchema } from "@/lib/validations";

const RATE_LIMIT_MSG = "Zu viele Anfragen. Bitte warte einen Moment.";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized", message: "Bitte melde dich erneut an." }, { status: 401 });

  const rl = await checkRateLimit(trackerLimiter, userId);
  if (!rl.success) {
    return NextResponse.json({ error: "rate_limited", message: RATE_LIMIT_MSG }, { status: 429 });
  }

  const supabase = createSupabaseAdmin();

  const body = await request.json().catch(() => ({}));
  const validation = validateBody(zieleUpdateSchema, body);
  if (!validation.success) {
    return NextResponse.json({ error: "invalid_input", message: validation.error }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("ea_ziele")
    .update({ ...validation.data, updated_at: new Date().toISOString() })
    .eq("id", params.id)
    .eq("user_id", userId)
    .select()
    .limit(1);

  if (error) { console.error("[tracker/ziele/:id] db error:", error); return NextResponse.json({ error: "internal_error" }, { status: 500 }); }
  if (!data?.length) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(data[0]);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "unauthorized", message: "Bitte melde dich erneut an." }, { status: 401 });

  const rl = await checkRateLimit(trackerLimiter, userId);
  if (!rl.success) {
    return NextResponse.json({ error: "rate_limited", message: RATE_LIMIT_MSG }, { status: 429 });
  }

  const supabase = createSupabaseAdmin();

  const { error } = await supabase
    .from("ea_ziele")
    .delete()
    .eq("id", params.id)
    .eq("user_id", userId);

  if (error) { console.error("[tracker/ziele/:id] db error:", error); return NextResponse.json({ error: "internal_error" }, { status: 500 }); }
  return NextResponse.json({ success: true });
}
