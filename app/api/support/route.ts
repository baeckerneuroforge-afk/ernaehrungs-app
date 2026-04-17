import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { validateBody, supportTicketSchema } from "@/lib/validations";
import { sendEmail } from "@/lib/email";
import { checkRateLimit, supportLimiter } from "@/lib/rate-limit";

const ALLOWED_SUBJECTS = [
  "Technisches Problem",
  "Frage zur App",
  "Abo & Zahlung",
  "Datenschutz",
  "Feedback",
  "Sonstiges",
] as const;

const SUPPORT_EMAIL = "kontakt@nutriva-ai.de";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    // Rate-Limit: User-ID wenn vorhanden, sonst IP (anonyme Tickets sind erlaubt).
    const ipHeader = request.headers.get("x-forwarded-for") || "anon";
    const rlKey = userId || `ip:${ipHeader.split(",")[0].trim()}`;
    const rl = await checkRateLimit(supportLimiter, rlKey);
    if (!rl.success) {
      return NextResponse.json(
        { error: "rate_limited", message: "Zu viele Tickets. Bitte warte eine Stunde." },
        { status: 429 }
      );
    }

    const rawBody = await request.json();
    const validation = validateBody(supportTicketSchema, rawBody);
    if (!validation.success) {
      return NextResponse.json(
        { error: "invalid_input", message: validation.error },
        { status: 400 }
      );
    }
    const { name, email, subject, message } = validation.data;

    // Belt-and-suspenders: zod enforces length, but only the curated subject
    // list is allowed here — a free-text subject would leak into the inbox.
    if (!ALLOWED_SUBJECTS.includes(subject as typeof ALLOWED_SUBJECTS[number])) {
      return NextResponse.json(
        { error: "Bitte wähle einen gültigen Betreff." },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    const { error } = await supabase.from("ea_support_tickets").insert({
      user_id: userId || null,
      name: name.trim(),
      email: email.trim(),
      subject,
      message: message.trim(),
    });

    if (error) {
      console.error("[support] insert failed:", error);
      return NextResponse.json(
        { error: "Beim Speichern ist ein Fehler aufgetreten." },
        { status: 500 }
      );
    }

    // Benachrichtigung an Support-Postfach. sendEmail degradiert graceful
    // wenn RESEND_API_KEY fehlt, deshalb fire-and-forget ohne await — das
    // Ticket ist bereits in der DB, die Mail ist nur Notification.
    const escapedMessage = message
      .trim()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\n/g, "<br>");
    void sendEmail({
      to: SUPPORT_EMAIL,
      subject: `[Support] ${subject} — ${name}`,
      html: `
        <div style="font-family: -apple-system, sans-serif; max-width: 600px;">
          <h2 style="color: #2D6A4F;">Neues Support-Ticket</h2>
          <p><strong>Von:</strong> ${name} &lt;${email.trim()}&gt;</p>
          <p><strong>User-ID:</strong> ${userId || "(anonym)"}</p>
          <p><strong>Betreff:</strong> ${subject}</p>
          <hr style="border: none; border-top: 1px solid #E7E5E4;">
          <p style="white-space: pre-wrap; color: #1C1917;">${escapedMessage}</p>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message:
        "Danke für deine Nachricht! Wir melden uns innerhalb von 24 Stunden.",
    });
  } catch (err) {
    console.error("[support] unexpected:", err);
    return NextResponse.json(
      { error: "Unerwarteter Fehler. Bitte versuche es erneut." },
      { status: 500 }
    );
  }
}
