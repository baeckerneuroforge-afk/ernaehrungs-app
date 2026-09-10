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

export type MonthlyReportData = {
  summary: string;
  weightAnalysis: string;
  nutritionAnalysis: string;
  goalProgress: string;
  recommendations: string[];
  stats: {
    weightStart: number | null;
    weightEnd: number | null;
    weightDelta: number | null;
    foodLogEntries: number;
    avgKcalPerDay: number | null;
    plansCreated: number;
  };
  weightSeries: { date: string; kg: number }[];
};

/**
 * Compute the ISO month range [start, end) for a given YYYY-MM string.
 */
export function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1)).toISOString();
  const end = new Date(Date.UTC(y, m, 1)).toISOString();
  return { start, end };
}

/**
 * Return the previous month in YYYY-MM format (relative to now).
 */
export function previousMonth(ref: Date = new Date()): string {
  const d = new Date(Date.UTC(ref.getUTCFullYear(), ref.getUTCMonth() - 1, 1));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

/**
 * Generate a personalized monthly progress report for one premium user.
 * Returns parsed report data (without persisting).
 */
export async function generateMonthlyReport(
  userId: string,
  month: string,
  options?: { isPremium?: boolean }
): Promise<MonthlyReportData> {
  const supabase = createSupabaseAdmin();
  const { start, end } = monthRange(month);
  const isPremium = options?.isPremium ?? false;

  // Parallelize all data fetches
  const [weightRes, foodRes, plansRes, goalsRes, profileRes] = await Promise.all([
    supabase
      .from("ea_weight_logs")
      .select("gewicht_kg, gemessen_am")
      .eq("user_id", userId)
      .gte("gemessen_am", start.split("T")[0])
      .lt("gemessen_am", end.split("T")[0])
      .order("gemessen_am", { ascending: true }),
    supabase
      .from("ea_food_log")
      .select("mahlzeit_typ, beschreibung, kalorien_geschaetzt, datum")
      .eq("user_id", userId)
      .gte("datum", start.split("T")[0])
      .lt("datum", end.split("T")[0])
      .order("datum", { ascending: true }),
    supabase
      .from("ea_meal_plans")
      .select("id, created_at, titel")
      .eq("user_id", userId)
      .gte("created_at", start)
      .lt("created_at", end),
    supabase
      .from("ea_ziele")
      .select("id, beschreibung, typ, zielwert, startwert, einheit, erreicht, erreicht_am, zieldatum, created_at")
      .eq("user_id", userId),
    supabase
      .from("ea_profiles")
      .select("alter_jahre, geschlecht, groesse_cm, gewicht_kg, ziel")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const weights = weightRes.data || [];
  const foodLogs = foodRes.data || [];
  const plans = plansRes.data || [];
  const goals = goalsRes.data || [];
  const profile = profileRes.data || null;

  // Derive stats
  const weightStart = weights[0]?.gewicht_kg ?? null;
  const weightEnd = weights[weights.length - 1]?.gewicht_kg ?? null;
  const weightDelta =
    weightStart != null && weightEnd != null
      ? Math.round((weightEnd - weightStart) * 10) / 10
      : null;

  const daysWithFood = new Set(foodLogs.map((f) => f.datum)).size;
  const totalKcal = foodLogs.reduce(
    (sum, f) => sum + (f.kalorien_geschaetzt || 0),
    0
  );
  const avgKcalPerDay =
    daysWithFood > 0 ? Math.round(totalKcal / daysWithFood) : null;

  const weightSeries = weights.map((w) => ({
    date: w.gemessen_am,
    kg: w.gewicht_kg,
  }));

  // Aggregate most common meals for prompt compactness
  const mealFreq: Record<string, number> = {};
  for (const f of foodLogs) {
    const key = (f.beschreibung || "").trim().toLowerCase().slice(0, 60);
    if (!key) continue;
    mealFreq[key] = (mealFreq[key] || 0) + 1;
  }
  const topMeals = Object.entries(mealFreq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, count]) => `${name} (${count}×)`);

  // Premium: load 3-month data for multi-month trends
  let premiumPromptAddition = "";
  if (isPremium) {
    const threeMonthsAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const [threeMonthWeightRes, threeMonthFoodRes, prevReportsRes] = await Promise.all([
      supabase
        .from("ea_weight_logs")
        .select("gewicht_kg, gemessen_am")
        .eq("user_id", userId)
        .gte("gemessen_am", threeMonthsAgo.split("T")[0])
        .order("gemessen_am", { ascending: true }),
      supabase
        .from("ea_food_log")
        .select("kalorien_geschaetzt, datum")
        .eq("user_id", userId)
        .gte("datum", threeMonthsAgo.split("T")[0]),
      supabase
        .from("ea_monthly_reports")
        .select("report_data, month")
        .eq("user_id", userId)
        .order("month", { ascending: false })
        .limit(3),
    ]);

    const threeMonthWeight = threeMonthWeightRes.data || [];
    const threeMonthFood = threeMonthFoodRes.data || [];
    const prevReports = prevReportsRes.data || [];

    // Compact the 3-month food data into monthly averages
    const foodByMonth: Record<string, number[]> = {};
    for (const f of threeMonthFood) {
      const m = f.datum?.slice(0, 7);
      if (m && f.kalorien_geschaetzt) {
        (foodByMonth[m] ??= []).push(f.kalorien_geschaetzt);
      }
    }
    const monthlyAvgKcal = Object.entries(foodByMonth).map(([m, vals]) => ({
      month: m,
      avgKcal: Math.round(vals.reduce((a, b) => a + b, 0) / vals.length),
      entries: vals.length,
    }));

    const prevSummaries = prevReports
      .filter((r) => r.month !== month) // exclude current
      .slice(0, 2)
      .map((r) => {
        const rd = r.report_data as MonthlyReportData | null;
        return { month: r.month, recommendations: rd?.recommendations || [] };
      });

    premiumPromptAddition = `

## PREMIUM ERWEITERUNGEN

### 📈 Multi-Monats-Trend (3 Monate)
GEWICHTSDATEN 3 MONATE: ${JSON.stringify(threeMonthWeight.map((w) => ({ date: w.gemessen_am, kg: w.gewicht_kg })))}
- Zeige den Gesamttrend über 3 Monate
- Vergleiche: Tempo der Veränderung (beschleunigt, stabil, verlangsamt?)

### 🥗 Kalorien-Entwicklung nach Monat
${JSON.stringify(monthlyAvgKcal)}

### 📊 Monat-zu-Monat Vergleich
VORHERIGE EMPFEHLUNGEN: ${JSON.stringify(prevSummaries)}
- Welche Empfehlungen aus Vormonaten wurden umgesetzt?

### 🔮 Prognose
- Bei aktuellem Tempo: Wann wird das Zielgewicht erreicht?
- Konkreter Ausblick für den nächsten Monat

Ergänze dein JSON um diese Felder:
- "multiMonthTrend": "..." (3-Monats-Zusammenfassung)
- "prognosis": "..." (Ausblick)
`;
  }

  // Build analysis prompt
  const contextPayload = {
    profile,
    weightSeries,
    weightDelta,
    weightStart,
    weightEnd,
    foodLogEntries: foodLogs.length,
    daysWithFood,
    avgKcalPerDay,
    topMeals,
    plansCreated: plans.length,
    goals: goals.map((g) => ({
      titel: g.beschreibung,
      typ: g.typ,
      zielwert: g.zielwert,
      deadline: g.zieldatum,
      // Canonical flag is `erreicht`; date alone is a fallback for older rows.
      erreicht: !!(g.erreicht || g.erreicht_am),
    })),
  };

  const prompt = `Erstelle eine monatliche Fortschrittsanalyse für den Nutzer dieser Ernährungs-App. Schreibe auf Deutsch, warmherzig aber fachlich. Du DUZT den Nutzer.

Monat: ${month}

Daten:
${JSON.stringify(contextPayload, null, 2)}

Struktur:
1. summary — 2-3 Sätze, positiv und motivierend, ohne Floskeln
2. weightAnalysis — Trend und Vergleich Monatsbeginn vs -ende, auf Daten bezogen
3. nutritionAnalysis — Was gut lief, was verbessert werden kann (kurz, konkret)
4. goalProgress — Wie nah am Ziel, realistisch?
5. recommendations — 3 konkrete, umsetzbare Tipps für den nächsten Monat

Wenn zu wenig Daten vorhanden sind (z.B. 0 Einträge), sei ehrlich und empfiehl dem Nutzer, das Tagebuch oder den Tracker häufiger zu nutzen.
${premiumPromptAddition}
Antworte AUSSCHLIESSLICH als gültiges JSON ohne Markdown-Codeblock:
{
  "summary": "...",
  "weightAnalysis": "...",
  "nutritionAnalysis": "...",
  "goalProgress": "...",
  "recommendations": ["...", "...", "..."]${isPremium ? ',\n  "multiMonthTrend": "...",\n  "prognosis": "..."' : ""}
}`;

  const anthropic = getAnthropic();
  const model = "claude-opus-4-7";
  const usageRequestId = createUsageRequestId();
  const llmStartedAt = Date.now();
  let response;
  try {
    response = await anthropic.messages.create({
      model,
      max_tokens: 2500,
      messages: [{ role: "user", content: prompt }],
    });
    void logUsage({
      userId,
      plan: isPremium ? "pro_plus" : "pro",
      endpoint: "monthly-report",
      action: isPremium ? "premium-monthly-report" : "monthly-report",
      model,
      ...extractAnthropicUsage(response.usage),
      creditsCharged: 0,
      requestId: usageRequestId,
      durationMs: Date.now() - llmStartedAt,
    });
  } catch (error) {
    void logUsage({
      userId,
      plan: isPremium ? "pro_plus" : "pro",
      endpoint: "monthly-report",
      action: isPremium ? "premium-monthly-report" : "monthly-report",
      model,
      creditsCharged: 0,
      requestId: usageRequestId,
      error: error instanceof Error ? error.message : "Monthly report API error",
      durationMs: Date.now() - llmStartedAt,
    });
    throw error;
  }

  const textBlock = response.content.find((b) => b.type === "text");
  const rawText = textBlock && textBlock.type === "text" ? textBlock.text : "";

  let parsed: {
    summary?: string;
    weightAnalysis?: string;
    nutritionAnalysis?: string;
    goalProgress?: string;
    recommendations?: string[];
  } = {};
  try {
    const cleaned = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(match ? match[0] : cleaned);
  } catch (e) {
    console.error("Monthly report JSON parse failed:", e, rawText);
  }

  return {
    summary: parsed.summary || "Konnte keine Zusammenfassung generieren.",
    weightAnalysis: parsed.weightAnalysis || "",
    nutritionAnalysis: parsed.nutritionAnalysis || "",
    goalProgress: parsed.goalProgress || "",
    recommendations: Array.isArray(parsed.recommendations)
      ? parsed.recommendations
      : [],
    stats: {
      weightStart,
      weightEnd,
      weightDelta,
      foodLogEntries: foodLogs.length,
      avgKcalPerDay,
      plansCreated: plans.length,
    },
    weightSeries,
  };
}

const JOB_NAME = "monthly-report";

/**
 * Run the monthly report generation for all premium users and persist.
 * Upserts into ea_monthly_reports keyed by (user_id, month).
 *
 * Verarbeitet User in Checkpoint-Batches (siehe lib/cron-checkpoint): pro Lauf
 * werden Batches ab dem gespeicherten clerk_id parallel abgearbeitet, bis das
 * Zeitbudget erreicht ist. Bricht der Lauf ab, setzt der nächste am Checkpoint
 * fort — kombiniert mit der (user, month)-Idempotenz kommen so garantiert alle
 * User dran, ohne Reports doppelt zu generieren.
 */
export async function runMonthlyReportsForAllPremium(month: string): Promise<{
  processed: number;
  failed: number;
  emailFailed: number;
  skippedNoConsent: number;
  skippedAlreadyExists: number;
  scanned: number;
  cycleComplete: boolean;
}> {
  const supabase = createSupabaseAdmin();
  const startedAt = Date.now();

  // Format "2026-03" → "März 2026" for the email subject line.
  const [yearStr, monthStr] = month.split("-");
  const monthLabel = new Date(
    Number(yearStr),
    Number(monthStr) - 1,
    1
  ).toLocaleDateString("de-DE", { month: "long", year: "numeric" });

  let processed = 0;
  let failed = 0;
  let emailFailed = 0;
  let skippedNoConsent = 0;
  let skippedAlreadyExists = 0;
  let scanned = 0;

  async function processUser(user: CronUser) {
    try {
      // DSGVO: Consent pro Lauf revalidieren — User könnte inzwischen widerrufen haben.
      if (!(await hasKiConsent(supabase, user.clerk_id))) {
        skippedNoConsent++;
        return;
      }

      // Idempotency: Falls bereits ein Report für (user, month) existiert, nicht neu generieren.
      // Schützt gegen Doppel-Trigger von Vercel Cron oder manuellen Reruns.
      const { data: existing } = await supabase
        .from("ea_monthly_reports")
        .select("id")
        .eq("user_id", user.clerk_id)
        .eq("month", month)
        .maybeSingle();

      if (existing) {
        skippedAlreadyExists++;
        return;
      }

      const report = await generateMonthlyReport(user.clerk_id, month, { isPremium: true });
      // INSERT (kein upsert): Die UNIQUE(user_id, month)-Constraint ist der
      // Serialisierungspunkt. Laufen zwei Cron-Invocations gleichzeitig, gewinnt
      // genau ein INSERT — der andere bekommt 23505 und schickt KEINE zweite
      // Mail. So ist der Job auch gegen überlappende Läufe idempotent.
      const { error: insertError } = await supabase
        .from("ea_monthly_reports")
        .insert({
          user_id: user.clerk_id,
          month,
          report_data: report,
        });
      if (insertError) {
        if (insertError.code === "23505") {
          // Paralleler Lauf war schneller — Report existiert bereits, keine Mail.
          skippedAlreadyExists++;
        } else {
          console.error(
            `Report insert failed for ${user.clerk_id}:`,
            insertError
          );
          failed++;
        }
      } else {
        processed++;
        if (user.email) {
          const template = emailTemplates.monthlyReportReady(
            user.name || "dort",
            monthLabel
          );
          const result = await sendEmail({
            to: user.email,
            subject: template.subject,
            html: template.html,
          });
          if (!result.success) {
            emailFailed++;
            console.warn(
              `[monthly-report] Email failed for ${user.clerk_id}: ${result.reason}`
            );
          }
        }
      }
    } catch (e) {
      console.error(`Report generation failed for ${user.clerk_id}:`, e);
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
        ["pro_plus", "admin"],
        checkpoint,
        CRON_BATCH_SIZE
      );
    } catch (e) {
      console.error("Could not load premium users:", e);
      break;
    }

    if (batch.length === 0) {
      cycleComplete = true;
      break;
    }

    // Checkpoint pro Gruppe fortschreiben (siehe weekly-coaching): begrenzt das
    // Reprocessing-Fenster bei Timeout auf ~5 User statt den ganzen Batch.
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

  return {
    processed,
    failed,
    emailFailed,
    skippedNoConsent,
    skippedAlreadyExists,
    scanned,
    cycleComplete,
  };
}
