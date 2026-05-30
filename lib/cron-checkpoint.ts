import { createSupabaseAdmin } from "@/lib/supabase/server";

/**
 * Checkpoint-Pagination für Cron-Jobs, die alle Premium-User abarbeiten.
 *
 * Statt ALLE User auf einmal zu laden und sequentiell zu verarbeiten (Timeout-
 * Risiko bei maxDuration 300s), holt ein Job pro Batch die nächsten N User ab
 * dem gespeicherten Checkpoint (sortiert nach clerk_id) und schreibt den
 * Fortschritt in ea_cron_state zurück. Bricht ein Lauf ab, setzt der nächste
 * am Checkpoint fort → über mehrere Läufe kommen garantiert alle dran.
 *
 * Tabelle: ea_cron_state (siehe migration_cron_state.sql).
 */

type Admin = ReturnType<typeof createSupabaseAdmin>;

export type CronUser = {
  clerk_id: string;
  email: string | null;
  name: string | null;
};

/** Pro Batch geladene User. Klein halten, damit zwischen Batches oft die Zeit geprüft wird. */
export const CRON_BATCH_SIZE = 50;
/** Parallelitätsgrenze innerhalb eines Batches (gleichzeitige LLM-/Mail-Calls). */
export const CRON_GROUP_SIZE = 5;
/** Soft-Limit: keine neuen Batches starten, sobald überschritten (< maxDuration 300s). */
export const CRON_TIME_BUDGET_MS = 240_000;

/** Liest den letzten verarbeiteten clerk_id für einen Job ('' = Zyklus-Start). */
export async function getCronCheckpoint(
  supabase: Admin,
  jobName: string
): Promise<string> {
  const { data } = await supabase
    .from("ea_cron_state")
    .select("last_processed_user_id")
    .eq("job_name", jobName)
    .maybeSingle();
  return data?.last_processed_user_id ?? "";
}

/** Schreibt den Fortschritt zurück, sodass der nächste Lauf hinter lastClerkId fortsetzt. */
export async function setCronCheckpoint(
  supabase: Admin,
  jobName: string,
  lastClerkId: string
): Promise<void> {
  await supabase.from("ea_cron_state").upsert(
    {
      job_name: jobName,
      last_processed_user_id: lastClerkId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "job_name" }
  );
}

/** Zyklus fertig — Checkpoint zurücksetzen, damit der nächste Lauf von vorn beginnt. */
export async function clearCronCheckpoint(
  supabase: Admin,
  jobName: string
): Promise<void> {
  await setCronCheckpoint(supabase, jobName, "");
}

/** Holt den nächsten Batch Premium-User nach dem Checkpoint, sortiert nach clerk_id. */
export async function fetchUserBatchAfter(
  supabase: Admin,
  plans: string[],
  afterClerkId: string,
  batchSize: number
): Promise<CronUser[]> {
  const { data, error } = await supabase
    .from("ea_users")
    .select("clerk_id, email, name")
    .in("subscription_plan", plans)
    .gt("clerk_id", afterClerkId)
    .order("clerk_id", { ascending: true })
    .limit(batchSize);
  if (error) throw error;
  return (data as CronUser[]) ?? [];
}

/**
 * Verarbeitet items in parallelen Gruppen (Default 5), um die Concurrency zu
 * begrenzen. allSettled statt all: ein unerwarteter Throw in einem item darf
 * niemals den ganzen Batch/Cron-Lauf abbrechen (die per-User-Logik fängt Fehler
 * bereits selbst — das hier ist die zweite Sicherung).
 */
export async function inGroups<T>(
  items: T[],
  groupSize: number,
  fn: (item: T) => Promise<void>
): Promise<void> {
  for (let i = 0; i < items.length; i += groupSize) {
    await Promise.allSettled(items.slice(i, i + groupSize).map(fn));
  }
}
