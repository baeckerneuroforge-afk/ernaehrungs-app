import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { session_id, user_message, assistant_message } =
      await request.json();

    if (!session_id || !user_message || !assistant_message) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createSupabaseAdmin();

    // Insert both messages
    const { error } = await supabase.from("ea_conversations").insert([
      {
        user_id: userId,
        session_id,
        role: "user",
        content: user_message,
      },
      {
        user_id: userId,
        session_id,
        role: "assistant",
        content: assistant_message,
      },
    ]);

    if (error) {
      console.error("Save conversation error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Chat save error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
