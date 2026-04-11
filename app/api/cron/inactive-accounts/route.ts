import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { logAdminAction } from "@/lib/admin-audit";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Remove every food photo owned by `clerkId` from Supabase Storage.
 * DSGVO Art. 17 — binary data must be wiped alongside DB rows.
 * Errors are logged but non-fatal so a single bad user doesn't poison the batch.
 */
async function wipeUserPhotos(
  supabase: SupabaseClient,
  clerkId: string
): Promise<void> {
  try {
    const { data: topLevel } = await supabase.storage
      .from("food-photos")
      .list(clerkId);

    if (!topLevel || topLevel.length === 0) return;

    const allPaths: string[] = [];
    for (const entry of topLevel) {
      if (entry.metadata) {
        allPaths.push(`${clerkId}/${entry.name}`);
      } else {
        const { data: subFiles } = await supabase.storage
          .from("food-photos")
          .list(`${clerkId}/${entry.name}`);
        if (subFiles) {
          for (const f of subFiles) {
            allPaths.push(`${clerkId}/${entry.name}/${f.name}`);
          }
        }
      }
    }

    if (allPaths.length > 0) {
      const { error } = await supabase.storage
        .from("food-photos")
        .remove(allPaths);
      if (error) {
        console.error(
          `[cron/inactive] storage cleanup partial failure for ${clerkId}:`,
          error.message
        );
      }
    }
  } catch (err) {
    console.error(`[cron/inactive] storage cleanup threw for ${clerkId}:`, err);
  }
}

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

  // ---- Warnings (11 months inactive) ----
  // Email delivery (Resend) is not wired up yet — we audit-log the warning so
  // we have a paper trail and can backfill the actual send later.
  let warned = 0;
  for (const u of toWarn) {
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
        // TODO: send Resend email when integration is live
        email_sent: false,
      },
    });
    warned++;
  }

  // ---- Deletions (12+ months inactive) ----
  // Mirrors app/api/user/delete/route.ts. We tolerate per-row failures so a
  // single bad row doesn't poison the whole batch.
  const userOwnedTables = [
    "ea_food_log",
    "ea_weight_logs",
    "ea_messages",
    "ea_conversations",
    "ea_meal_plans",
    "ea_ziele",
    "ea_credit_transactions",
    "ea_feedback",
    "ea_profiles",
  ] as const;

  let deleted = 0;
  const failures: { clerk_id: string; reason: string }[] = [];
  const clerk = await clerkClient();

  for (const u of toDelete) {
    try {
      // Storage first — DB wipe is the "commit point", so if storage fails
      // we'd rather have orphaned DB rows than orphaned photos.
      await wipeUserPhotos(supabase, u.clerk_id);

      for (const table of userOwnedTables) {
        const { error } = await supabase
          .from(table)
          .delete()
          .eq("user_id", u.clerk_id);
        if (error) {
          console.error(
            `[cron/inactive] failed to clear ${table} for ${u.clerk_id}:`,
            error.message
          );
        }
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

      await logAdminAction({
        adminId: "system:cron",
        action: "inactive_account_deleted",
        resourceType: "ea_users",
        resourceId: u.clerk_id,
        targetUserId: u.clerk_id,
        metadata: {
          email: u.email,
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
    deleted,
    failures,
    ran_at: now.toISOString(),
  });
}
