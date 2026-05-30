import { NextResponse } from "next/server";
import { getAnthropic } from "@/lib/anthropic-client";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/email";
import { emailTemplates } from "@/lib/email-templates";
import { hasKiConsent } from "@/lib/consent";
import {
  type CronUser,
  CRON_BATCH_SIZE,
  CRON_GROUP_SIZE,
  CRON_TIME_BUDGET_MS,
  getCronCheckpoint,
  setCronCheckpoint,
  clearCronCheckpoint,
  fetchUserBatchAfter,
  inGroups,
} from "@/lib/cron-checkpoint";
import {
  createUsageRequestId,
  extractAnthropicUsage,
  logUsage,
} from "@/lib/usage-logging";

export const runtime = "nodejs";
export const maxDuration = 300;

const JOB_NAME = "weekly-coaching";

/**
 * Weekly coaching cron. Runs every Monday at 07:00 UTC (09:00 CET).
 * Generates 3 personalized coaching tips for each premium (pro_plus) user
 * based on their last week's data, then sends via email.
 *
 * Verarbeitet User in Checkpoint-Batches (siehe lib/cron-checkpoint): pro Lauf
 * werden Batches ab dem gespeicherten clerk_id parallel abgearbeitet, bis das
 * Zeitbudget erreicht ist. Bricht der Lauf ab, setzt der nächste fort.
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
  const startedAt = Date.now();
  const sevenDaysAgo = new Date(
    startedAt - 7 * 24 * 60 * 60 * 1000
  ).toISOString();

  let sent = 0;
  let failed = 0;
  let skippedNoConsent = 0;
  let scanned = 0;

  async function processUser(user: CronUser) {
    const userId = user.clerk_id;
    const usageRequestId = createUsageRequestId();
    const model = "claude-haiku-4-5-20251001";
    let llmStartedAt = 0;
    try {
      // DSGVO: User könnte Consent zwischen Subscription-Aktivierung und Cron-Lauf widerrufen haben.
      if (!(await hasKiConsent(supabase, userId))) {
        skippedNoConsent++;
        return;
      }

      const [profileRes, foodRes, weightRes, goalsRes] = await Promise.all([
        supabase
          .from("ea_profiles")
          .select("name, ziel, ernaehrungsform, allergien, gewicht_kg, calorie_target")
          .eq("user_id", userId)
          .maybeSingle(),
        supabase
          .from("ea_food_log")
          .select("beschreibung, kalorien_geschaetzt, datum")
          .eq("user_id", userId)
          .gte("created_at", sevenDaysAgo)
          .order("created_at", { ascending: true }),
        supabase
          .from("ea_weight_logs")
          .select("gewicht_kg, gemessen_am")
          .eq("user_id", userId)
          .gte("created_at", sevenDaysAgo)
          .order("gemessen_am", { ascending: true }),
        supabase
          .from("ea_ziele")
          .select("beschreibung, zielwert, einheit, erreicht")
          .eq("user_id", userId)
          .eq("erreicht", false),
      ]);

      const profile = profileRes.data;
      const foodLogs = foodRes.data || [];
      const weightLogs = weightRes.data || [];
      const goals = goalsRes.data || [];
      const userName = profile?.name || user.name || "dort";

      const anthropic = getAnthropic();
      llmStartedAt = Date.now();
      const response = await anthropic.messages.create({
        model,
        max_tokens: 800,
        system: `Du bist Janines KI-Ernährungscoach bei Nutriva. Erstelle 3 kurze, konkrete Coaching-Tipps für die kommende Woche.

Basiere auf den Nutzerdaten. Maximal 150 Wörter gesamt. Persönlich, warm, motivierend.
Format: Begrüßung mit Vorname, dann 3 nummerierte Tipps, dann ein motivierender Closer.
Maximal 3 Emojis gesamt. Schreibe auf Deutsch, duze den Nutzer.

Wenn wenig Daten vorhanden sind, gib trotzdem allgemeine aber nützliche Tipps.

NUTZERPROFIL:
${JSON.stringify(profile || {})}

TAGEBUCH (letzte 7 Tage, ${foodLogs.length} Einträge):
${JSON.stringify(foodLogs.slice(0, 30))}

GEWICHT (letzte 7 Tage):
${JSON.stringify(weightLogs)}

AKTIVE ZIELE:
${JSON.stringify(goals)}`,
        messages: [{ role: "user", content: "Erstelle meine wöchentlichen Coaching-Tipps." }],
      });
      void logUsage({
        userId,
        plan: "pro_plus",
        endpoint: "weekly-coaching",
        action: "premium-weekly-coaching",
        model,
        ...extractAnthropicUsage(response.usage),
        creditsCharged: 0,
        requestId: usageRequestId,
        durationMs: Date.now() - llmStartedAt,
      });

      const textBlock = response.content.find((b) => b.type === "text");
      const coachingText = textBlock && textBlock.type === "text" ? textBlock.text : "";

      if (user.email && coachingText) {
        const template = emailTemplates.weeklyCoaching(userName, coachingText);
        const result = await sendEmail({
          to: user.email,
          subject: template.subject,
          html: template.html,
        });
        if (result.success) {
          sent++;
          console.log(`[coaching] Sent to ${userId}`);
        } else {
          failed++;
          console.warn(`[coaching] Email failed for ${userId}: ${result.reason}`);
        }
      }
    } catch (err) {
      console.error(`[coaching] Failed for ${user.clerk_id}:`, err);
      void logUsage({
        userId,
        plan: "pro_plus",
        endpoint: "weekly-coaching",
        action: "premium-weekly-coaching",
        model,
        creditsCharged: 0,
        requestId: usageRequestId,
        error: err instanceof Error ? err.message : "Weekly coaching failed",
        durationMs: llmStartedAt ? Date.now() - llmStartedAt : undefined,
      });
      failed++;
    }
  }

  let checkpoint = await getCronCheckpoint(supabase, JOB_NAME);
  let cycleComplete = false;

  while (Date.now() - startedAt < CRON_TIME_BUDGET_MS) {
    let batch: CronUser[];
    try {
      batch = await fetchUserBatchAfter(
        supabase,
        ["pro_plus"],
        checkpoint,
        CRON_BATCH_SIZE
      );
    } catch (e) {
      console.error("[coaching] Could not load premium users:", e);
      break;
    }

    if (batch.length === 0) {
      cycleComplete = true;
      break;
    }

    // Checkpoint pro Gruppe fortschreiben (nicht erst pro Batch): bei einem
    // harten Timeout werden so höchstens die ~5 User der laufenden Gruppe
    // erneut verarbeitet, nicht der ganze Batch.
    await inGroups(batch, CRON_GROUP_SIZE, processUser, async (last) => {
      await setCronCheckpoint(supabase, JOB_NAME, last.clerk_id);
    });

    scanned += batch.length;
    checkpoint = batch[batch.length - 1].clerk_id;

    if (batch.length < CRON_BATCH_SIZE) {
      cycleComplete = true;
      break;
    }
  }

  // Zyklus komplett → Checkpoint zurücksetzen, damit der nächste Lauf von vorn beginnt.
  if (cycleComplete) {
    await clearCronCheckpoint(supabase, JOB_NAME);
  }

  return NextResponse.json({
    ok: true,
    sent,
    failed,
    skippedNoConsent,
    scanned,
    cycleComplete,
  });
}
