import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";

const saveSchema = z.object({
  session_id: z.string().min(1).max(128),
  user_message: z.string().min(1).max(20000),
  assistant_message: z.string().min(1).max(20000),
});

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "invalid_json" }, { status: 400 });
    }
    const parsed = saveSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "invalid_input", message: "Ungültiger Request-Body." },
        { status: 400 }
      );
    }
    const { session_id, user_message, assistant_message } = parsed.data;

    const supabase = createSupabaseAdmin();

    // Insert both messages. created_at wird explizit gesetzt (user 1ms vor
    // assistant), sonst bekämen beide Rows aus dem Batch-Insert denselben
    // now()-Timestamp → die serverseitige History könnte die Reihenfolge
    // innerhalb eines Turns vertauschen (Anthropic verlangt user-first).
    const turnTs = Date.now();
    const { error } = await supabase.from("ea_conversations").insert([
      {
        user_id: userId,
        session_id,
        role: "user",
        content: user_message,
        created_at: new Date(turnTs).toISOString(),
      },
      {
        user_id: userId,
        session_id,
        role: "assistant",
        content: assistant_message,
        created_at: new Date(turnTs + 1).toISOString(),
      },
    ]);

    if (error) {
      console.error("[chat/save] db error:", error);
      return NextResponse.json(
        { error: "internal_error", message: "Nachricht konnte nicht gespeichert werden." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[chat/save] unexpected error:", error);
    return NextResponse.json(
      { error: "internal_error" },
      { status: 500 }
    );
  }
}
