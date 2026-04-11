import { auth } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { validateBody, supportTicketSchema } from "@/lib/validations";

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

    // TODO: When Resend is configured (RESEND_API_KEY), send a notification
    // email to SUPPORT_EMAIL with the ticket details. Pattern:
    //
    //   import { Resend } from "resend";
    //   const resend = new Resend(process.env.RESEND_API_KEY);
    //   await resend.emails.send({
    //     from: "Nutriva Support <no-reply@nutriva-ai.de>",
    //     to: SUPPORT_EMAIL,
    //     replyTo: email.trim(),
    //     subject: `[Support] ${subject} — ${name}`,
    //     text: message.trim(),
    //   });
    void SUPPORT_EMAIL;

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
