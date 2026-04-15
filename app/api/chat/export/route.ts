import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { getUserPlan } from "@/lib/feature-gates-server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/chat/export?sessionId=xxx
 * Premium-only: Export a chat session as downloadable HTML document.
 * Uses an HTML approach (no external PDF lib needed).
 */
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const plan = await getUserPlan(userId);
  if (plan !== "pro_plus" && plan !== "admin") {
    return NextResponse.json(
      { error: "premium_required", message: "Chat-Export ist im Premium-Plan verfügbar." },
      { status: 403 }
    );
  }

  const sessionId = req.nextUrl.searchParams.get("sessionId");
  if (!sessionId) {
    return NextResponse.json({ error: "missing_session_id" }, { status: 400 });
  }

  const supabase = createSupabaseAdmin();

  const { data: messages } = await supabase
    .from("ea_conversations")
    .select("role, content, created_at")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (!messages?.length) {
    return NextResponse.json({ error: "no_messages" }, { status: 404 });
  }

  const { data: profile } = await supabase
    .from("ea_profiles")
    .select("name")
    .eq("user_id", userId)
    .maybeSingle();

  const userName = profile?.name || "Nutzer";
  const firstDate = new Date(messages[0].created_at).toLocaleDateString("de-DE");

  // Build first user message as title
  const firstUserMsg = messages.find((m) => m.role === "user");
  const title = firstUserMsg?.content?.slice(0, 60) || "Gespräch";

  const messagesHtml = messages
    .map((m) => {
      const isUser = m.role === "user";
      const time = new Date(m.created_at).toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const escapedContent = m.content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
      return `
        <div style="margin-bottom: 16px; display: flex; flex-direction: column; align-items: ${isUser ? "flex-end" : "flex-start"};">
          <div style="font-size: 10px; color: #A8A29E; margin-bottom: 4px;">${isUser ? userName : "Nutriva"} · ${time}</div>
          <div style="max-width: 80%; padding: 12px 16px; border-radius: 16px; font-size: 14px; line-height: 1.6; ${
            isUser
              ? "background: #2D6A4F; color: white; border-bottom-right-radius: 4px;"
              : "background: #F5F5F0; color: #1C1917; border: 1px solid #E7E5E4; border-bottom-left-radius: 4px;"
          }">${escapedContent}</div>
        </div>`;
    })
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <title>${title} — Nutriva-AI</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 700px; margin: 0 auto; padding: 40px 20px; background: #FAFAF5; color: #1C1917; }
    @media print { body { padding: 20px; } }
  </style>
</head>
<body>
  <div style="text-align: center; margin-bottom: 32px; padding-bottom: 16px; border-bottom: 1px solid #E7E5E4;">
    <div style="font-size: 18px; font-weight: 600; color: #2D6A4F;">🌿 Nutriva-AI</div>
    <h1 style="font-size: 20px; margin: 8px 0 4px;">${title}</h1>
    <p style="font-size: 13px; color: #A8A29E;">${firstDate} · ${messages.length} Nachrichten</p>
  </div>
  ${messagesHtml}
  <div style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #E7E5E4; text-align: center; font-size: 11px; color: #A8A29E;">
    Exportiert von Nutriva-AI · nutriva-ai.de
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `attachment; filename="nutriva-chat-${sessionId.slice(0, 8)}.html"`,
    },
  });
}
