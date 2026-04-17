import { auth, clerkClient } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
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

  // ---- Storage cleanup: remove every food photo owned by this user.
  // DSGVO Art. 17 — the "right to be forgotten" covers binary data too, not
  // just database rows. Photos live under food-photos/{userId}/{yyyy-mm-dd}/*.
  // We traverse the top-level listing, descend into each date folder, and
  // batch-remove. Errors are logged but non-fatal so the DB wipe still runs.
  try {
    const { data: topLevel } = await supabase.storage
      .from("food-photos")
      .list(userId);

    if (topLevel && topLevel.length > 0) {
      const allPaths: string[] = [];
      for (const entry of topLevel) {
        // Supabase marks "real" files with non-null metadata; folders have
        // metadata === null. We only expect date-folders at this level, but
        // handle either case defensively.
        if (entry.metadata) {
          allPaths.push(`${userId}/${entry.name}`);
        } else {
          const { data: subFiles } = await supabase.storage
            .from("food-photos")
            .list(`${userId}/${entry.name}`);
          if (subFiles) {
            for (const f of subFiles) {
              allPaths.push(`${userId}/${entry.name}/${f.name}`);
            }
          }
        }
      }
      if (allPaths.length > 0) {
        const { error: removeErr } = await supabase.storage
          .from("food-photos")
          .remove(allPaths);
        if (removeErr) {
          console.error(
            `[user/delete] storage cleanup partial failure for ${userId}:`,
            removeErr.message
          );
        }
      }
    }
  } catch (err) {
    console.error(`[user/delete] storage cleanup threw for ${userId}:`, err);
    // Non-fatal — continue with DB wipe.
  }

  // Delete all user-owned rows. CASCADE handles most child rows via ea_profiles,
  // but we explicitly clear every table to be safe (and because not all tables
  // necessarily cascade).
  const userOwnedTables = [
    "ea_food_log",
    "ea_weight_logs",
    "ea_messages",
    "ea_conversations",
    "ea_meal_plans",
    "ea_ziele",
    "ea_credit_transactions",
    "ea_feedback",
    "ea_monthly_reports",
    "ea_support_tickets",
    "ea_admin_audit_log",
    "ea_onboarding_tour",
    "ea_profiles",
  ] as const;

  for (const table of userOwnedTables) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId);
    if (error) {
      // Continue on error – we still want to delete the account record.
      console.error(`[user/delete] failed to clear ${table}:`, error.message);
    }
  }

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
