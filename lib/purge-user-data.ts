import { createSupabaseAdmin } from "@/lib/supabase/server";

type AdminClient = ReturnType<typeof createSupabaseAdmin>;

/**
 * Canonical list of tables that hold user-owned data keyed by the user's
 * Clerk ID in a `user_id` column. Every account-deletion path imports this so
 * the three flows — self-delete, inactive-accounts cron, Clerk user.deleted
 * webhook — can never drift out of sync.
 *
 * Deliberately NOT in this list (handled specially, see purgeUserData):
 *   - ea_users            → keyed by `clerk_id`, deleted by the caller after
 *                           purge (the webhook must NOT, Clerk already removed it)
 *   - ea_admin_audit_log  → ANONYMIZED, not deleted (audit-trail retention for
 *                           DSGVO accountability). Keyed by admin_id/
 *                           target_user_id; it has no `user_id` column at all,
 *                           so a `.eq("user_id", ...)` delete would silently fail.
 *   - onboarding_tour_done → a COLUMN on ea_profiles, not a table. Removed when
 *                           the ea_profiles row is deleted.
 */
export const USER_DATA_TABLES = [
  "ea_food_log",
  "ea_weight_logs",
  "ea_messages",
  "ea_conversations",
  "ea_meal_plans",
  "ea_ziele",
  "ea_credit_transactions",
  "ea_ai_usage",
  "ea_feedback",
  "ea_monthly_reports",
  "ea_support_tickets",
  "ea_user_roles",
  "ea_profiles",
] as const;

export type UserDataTable = (typeof USER_DATA_TABLES)[number];

/**
 * Remove every food photo owned by `userId` from Supabase Storage.
 * DSGVO Art. 17 — binary data must be wiped alongside DB rows. Photos live
 * under food-photos/{userId}/{yyyy-mm-dd}/*. We traverse the top-level listing,
 * descend into each date folder, and batch-remove. Errors are logged but
 * non-fatal so the DB wipe still runs.
 */
export async function wipeUserPhotos(
  supabase: AdminClient,
  userId: string,
  logPrefix = "purge"
): Promise<void> {
  try {
    const { data: topLevel } = await supabase.storage
      .from("food-photos")
      .list(userId);

    if (!topLevel || topLevel.length === 0) return;

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
      const { error } = await supabase.storage
        .from("food-photos")
        .remove(allPaths);
      if (error) {
        console.error(
          `[${logPrefix}] storage cleanup partial failure for ${userId}:`,
          error.message
        );
      }
    }
  } catch (err) {
    console.error(`[${logPrefix}] storage cleanup threw for ${userId}:`, err);
    // Non-fatal — continue with DB wipe.
  }
}

// Metadata keys in ea_admin_audit_log that may carry personal data and must be
// scrubbed when the referenced user is erased (e.g. the inactive-accounts cron
// stores the user's email in metadata).
const AUDIT_METADATA_PII_KEYS = ["email", "name"] as const;

/**
 * Anonymize — NOT delete — a user's audit-log footprint. DSGVO Art. 17 requires
 * erasing personal data, but Art. 17(3) / accountability lets us retain the
 * audit trail itself. We therefore:
 *   - replace admin_id / target_user_id with the literal "deleted" wherever they
 *     equal this user, and
 *   - strip known PII keys (email, name) from the metadata JSONB.
 * The action, resource_type and timestamps are retained (no longer personal once
 * the identifiers are removed).
 *
 * Note: Clerk IDs are alphanumeric + underscore ("user_…"), so embedding `userId`
 * in a PostgREST .or() filter is safe (no commas/parentheses to escape).
 */
export async function anonymizeAuditLog(
  supabase: AdminClient,
  userId: string,
  logPrefix = "purge"
): Promise<void> {
  const { data: rows, error } = await supabase
    .from("ea_admin_audit_log")
    .select("id, admin_id, target_user_id, metadata")
    .or(`target_user_id.eq.${userId},admin_id.eq.${userId}`);

  if (error) {
    console.error(`[${logPrefix}] audit log fetch failed:`, error.message);
    throw new Error(error.message);
  }
  if (!rows || rows.length === 0) return;

  for (const row of rows) {
    const meta =
      row.metadata && typeof row.metadata === "object"
        ? { ...(row.metadata as Record<string, unknown>) }
        : {};
    for (const key of AUDIT_METADATA_PII_KEYS) {
      delete meta[key];
    }

    const { error: updateErr } = await supabase
      .from("ea_admin_audit_log")
      .update({
        admin_id: row.admin_id === userId ? "deleted" : row.admin_id,
        target_user_id:
          row.target_user_id === userId ? "deleted" : row.target_user_id,
        metadata: meta,
      })
      .eq("id", row.id);

    if (updateErr) {
      console.error(
        `[${logPrefix}] audit log anonymize failed for row ${row.id}:`,
        updateErr.message
      );
    }
  }
}

/**
 * Full DSGVO Art. 17 purge of a single user's data. Wipes storage photos,
 * deletes every USER_DATA_TABLES row, and anonymizes the audit log.
 *
 * Does NOT delete the ea_users record or the Clerk account — callers handle
 * those, because the three deletion paths differ:
 *   - self-delete / inactive-cron: delete ea_users + Clerk account afterwards
 *   - Clerk webhook (user.deleted): delete ea_users only (Clerk already gone)
 *
 * Returns the list of non-fatal errors so callers can report/log them.
 */
export async function purgeUserData(
  supabase: AdminClient,
  userId: string,
  logPrefix = "purge"
): Promise<{ errors: string[] }> {
  const errors: string[] = [];

  // Storage first — the DB wipe is the "commit point"; if storage fails we'd
  // rather have orphaned DB rows than orphaned photos.
  await wipeUserPhotos(supabase, userId, logPrefix);

  for (const table of USER_DATA_TABLES) {
    const { error } = await supabase.from(table).delete().eq("user_id", userId);
    if (error) {
      errors.push(`${table}: ${error.message}`);
      console.error(`[${logPrefix}] failed to clear ${table}:`, error.message);
    }
  }

  try {
    await anonymizeAuditLog(supabase, userId, logPrefix);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`ea_admin_audit_log: ${msg}`);
  }

  return { errors };
}
