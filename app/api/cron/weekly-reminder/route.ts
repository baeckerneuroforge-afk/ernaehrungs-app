import { NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { emailTemplates } from "@/lib/email-templates";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Sunday 09:00 UTC: poke premium-ish users who opted into the weekly review
 * reminder. We fetch all users and filter in JS because Postgres JSONB
 * boolean filtering via the Supabase client is awkward and the user count is
 * still small.
 *
 * Auth: Bearer CRON_SECRET (same pattern as inactive-accounts).
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET not configured" },
      { status: 500 }
    );
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();

  const { data: users, error } = await supabase
    .from("ea_users")
    .select("clerk_id, email, name, notification_preferences");

  if (error) {
    return NextResponse.json(
      { error: "scan_failed", message: error.message },
      { status: 500 }
    );
  }

  let sent = 0;
  for (const u of users ?? []) {
    const prefs = u.notification_preferences as
      | { review_reminder?: { enabled?: boolean } }
      | null;
    if (!prefs?.review_reminder?.enabled) continue;
    if (!u.email) continue;

    const template = emailTemplates.weeklyReviewReminder(u.name || "dort");
    const result = await sendEmail({
      to: u.email,
      subject: template.subject,
      html: template.html,
    });
    if (result.success) sent++;
  }

  return NextResponse.json({
    ok: true,
    scanned: users?.length ?? 0,
    sent,
    ran_at: new Date().toISOString(),
  });
}
