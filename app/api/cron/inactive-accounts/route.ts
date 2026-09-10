import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { purgeUserData } from "@/lib/purge-user-data";
import { cancelStripeSubscriptionForUser } from "@/lib/cancel-stripe-subscription";
import { logAdminAction } from "@/lib/admin-audit";
import { sendEmail } from "@/lib/email";
import { emailTemplates } from "@/lib/email-templates";

export const dynamic = "force-dynamic";
// Vercel cron may exceed default 10s — give the loop room to breathe.
export const maxDuration = 60;

/**
 * Daily cron: warn users at 11 months of inactivity, delete users at 12+ months.
 *
 * Auth: Bearer token via CRON_SECRET env var. Vercel Cron automatically sends
 * `Authorization: Bearer <CRON_SECRET>` when the env var is set.
 *
 * Schedule: configured in vercel.json — runs 03:00 UTC daily.
 */
export async function GET(request: Request) {
  // ---- Auth ----
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
  const now = new Date();
  const elevenMonthsAgo = new Date(now);
  elevenMonthsAgo.setMonth(elevenMonthsAgo.getMonth() - 11);
  const twelveMonthsAgo = new Date(now);
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  // ---- Find inactive accounts (anything older than 11 months) ----
  // We pull metadata once and partition in JS so we can act on both buckets
  // in a single pass.
  const { data: inactive, error: scanErr } = await supabase
    .from("ea_users")
    .select("clerk_id, email, name, last_active_at")
    .lt("last_active_at", elevenMonthsAgo.toISOString());

  if (scanErr) {
    return NextResponse.json(
      { error: "scan_failed", message: scanErr.message },
      { status: 500 }
    );
  }

  const toDelete: typeof inactive = [];
  const toWarn: typeof inactive = [];
  for (const u of inactive ?? []) {
    if (!u.last_active_at) continue;
    const lastActive = new Date(u.last_active_at);
    if (lastActive < twelveMonthsAgo) {
      toDelete.push(u);
    } else {
      toWarn.push(u);
    }
  }

  // ---- Warnings (11 months inactive) — once only per user ----
  let warned = 0;
  let skippedAlreadyWarned = 0;
  for (const u of toWarn) {
    // Throttle: skip if we already logged a warning for this user.
    const { data: prior } = await supabase
      .from("ea_admin_audit_log")
      .select("id")
      .eq("action", "inactive_warning_sent")
      .eq("target_user_id", u.clerk_id)
      .limit(1);
    if (prior && prior.length > 0) {
      skippedAlreadyWarned++;
      continue;
    }

    let emailSent = false;
    if (u.email) {
      const template = emailTemplates.inactiveWarning(u.name || "dort");
      const result = await sendEmail({
        to: u.email,
        subject: template.subject,
        html: template.html,
      });
      emailSent = result.success;
    }
    await logAdminAction({
      adminId: "system:cron",
      action: "inactive_warning_sent",
      resourceType: "ea_users",
      resourceId: u.clerk_id,
      targetUserId: u.clerk_id,
      metadata: {
        email: u.email,
        last_active_at: u.last_active_at,
        scheduled_deletion_in_days: 30,
        email_sent: emailSent,
      },
    });
    warned++;
  }

  // ---- Deletions (12+ months inactive) ----
  // Full purge via the shared lib/purge-user-data.ts (storage + every
  // USER_DATA_TABLES row + audit-log anonymization). We tolerate per-user
  // failures so a single bad row doesn't poison the whole batch.
  let deleted = 0;
  const failures: { clerk_id: string; reason: string }[] = [];
  const clerk = await clerkClient();

  for (const u of toDelete) {
    try {
      // Farewell before wipe (email is still available).
      if (u.email) {
        const template = emailTemplates.accountDeleted(u.name || "dort");
        await sendEmail({
          to: u.email,
          subject: template.subject,
          html: template.html,
        });
      }

      await cancelStripeSubscriptionForUser(
        supabase,
        u.clerk_id,
        "cron/inactive"
      );

      const { errors } = await purgeUserData(
        supabase,
        u.clerk_id,
        "cron/inactive"
      );
      if (errors.length > 0) {
        console.error(
          `[cron/inactive] purge had non-fatal errors for ${u.clerk_id}:`,
          errors
        );
      }

      const { error: userErr } = await supabase
        .from("ea_users")
        .delete()
        .eq("clerk_id", u.clerk_id);
      if (userErr) throw new Error(`ea_users delete: ${userErr.message}`);

      try {
        await clerk.users.deleteUser(u.clerk_id);
      } catch (err) {
        // Clerk-side delete failure is logged but doesn't roll back the
        // Supabase wipe — DSGVO obligation is to remove the data.
        console.error(
          `[cron/inactive] Clerk delete failed for ${u.clerk_id}:`,
          err
        );
      }

      // Record the deletion for accountability. NOTE: no email in metadata —
      // we just erased this user, so re-storing their email here would defeat
      // the purge. The clerk_id is retained as an opaque, post-deletion
      // reference (no longer linkable to a person).
      await logAdminAction({
        adminId: "system:cron",
        action: "inactive_account_deleted",
        resourceType: "ea_users",
        resourceId: u.clerk_id,
        targetUserId: u.clerk_id,
        metadata: {
          last_active_at: u.last_active_at,
          reason: "inactive_12_months",
        },
      });
      deleted++;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      failures.push({ clerk_id: u.clerk_id, reason });
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: inactive?.length ?? 0,
    warned,
    skippedAlreadyWarned,
    deleted,
    failures,
  });
}
