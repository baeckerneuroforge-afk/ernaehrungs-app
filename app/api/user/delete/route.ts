import { auth, clerkClient } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { purgeUserData } from "@/lib/purge-user-data";
import { sendEmail } from "@/lib/email";
import { emailTemplates } from "@/lib/email-templates";
import { NextResponse } from "next/server";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdmin();

  // Fetch identity BEFORE the wipe — after the row is gone we no longer have
  // an email to send the farewell to. We block on the send (no fire-and-forget)
  // because we're about to delete the only record of this user.
  const { data: userRow } = await supabase
    .from("ea_users")
    .select("email, name")
    .eq("clerk_id", userId)
    .maybeSingle();

  if (userRow?.email) {
    const template = emailTemplates.accountDeleted(userRow.name || "dort");
    await sendEmail({
      to: userRow.email,
      subject: template.subject,
      html: template.html,
    });
  }

  // Storage photos + all user-owned tables + audit-log anonymization.
  // Shared with the inactive-accounts cron and the Clerk user.deleted webhook
  // via lib/purge-user-data.ts so the three paths can never drift apart.
  await purgeUserData(supabase, userId, "user/delete");

  // Finally remove the ea_users record
  const { error: userErr } = await supabase
    .from("ea_users")
    .delete()
    .eq("clerk_id", userId);
  if (userErr) {
    console.error("[user/delete] failed to clear ea_users:", userErr.message);
  }

  // Delete the Clerk account itself
  try {
    const client = await clerkClient();
    await client.users.deleteUser(userId);
  } catch (err) {
    console.error("[user/delete] failed to delete Clerk user:", err);
    return NextResponse.json(
      { error: "Konto-Daten gelöscht, aber Clerk-Account konnte nicht entfernt werden. Bitte Support kontaktieren." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
