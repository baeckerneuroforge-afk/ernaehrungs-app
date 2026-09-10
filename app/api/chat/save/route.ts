import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, chatLimiter } from "@/lib/rate-limit";
import { verifyChatSaveToken } from "@/lib/chat-save-token";

// Client may save the turn after streaming. Assistant content is only accepted
// when accompanied by an HMAC save_token issued by /api/chat at stream end —
// so a client cannot inject forged "assistant" turns into LLM history.

const saveSchema = z.object({
  session_id: z.string().min(1).max(128),
  // Empty allowed for image-only turns (server used a default prompt).
  user_message: z.string().max(20000).default(""),
  assistant_message: z.string().min(1).max(20000),
  save_token: z.string().min(32).max(128),
});

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const rl = await checkRateLimit(chatLimiter, userId);
    if (!rl.success) {
      return NextResponse.json(
        { error: "rate_limited", message: "Zu viele Anfragen." },
        { status: 429 }
      );
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
    const { session_id, assistant_message, save_token } = parsed.data;
    const user_message =
      parsed.data.user_message?.trim() ||
      (assistant_message ? "Analysiere dieses Bild" : "");

    if (!user_message) {
      return NextResponse.json(
        { error: "invalid_input", message: "user_message fehlt." },
        { status: 400 }
      );
    }

    if (
      !verifyChatSaveToken(
        userId,
        session_id,
        user_message,
        assistant_message,
        save_token
      )
    ) {
      return NextResponse.json(
        {
          error: "invalid_token",
          message: "Speichern abgelehnt — ungültige Stream-Signatur.",
        },
        { status: 403 }
      );
    }

    const supabase = createSupabaseAdmin();

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
