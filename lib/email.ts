import { Resend } from "resend";

// Graceful degradation: if RESEND_API_KEY isn't set (local dev, preview builds),
// sendEmail becomes a no-op that just logs. Production must set the key.
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM_EMAIL = "Ernährungsberatung by Janine <kontakt@nutriva-ai.de>";

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  reason?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  if (!resend) {
    console.log("[email] Resend not configured, skipping:", params.subject);
    return { success: false, reason: "not_configured" };
  }

  if (!params.to) {
    console.warn("[email] no recipient, skipping:", params.subject);
    return { success: false, reason: "no_recipient" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });

    if (error) {
      console.error("[email] send failed:", error);
      return { success: false, reason: error.message };
    }

    console.log("[email] sent:", params.subject, "→", params.to);
    return { success: true, id: data?.id };
  } catch (err) {
    console.error("[email] exception:", err);
    return { success: false, reason: "exception" };
  }
}
