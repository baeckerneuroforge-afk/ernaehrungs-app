import Anthropic from "@anthropic-ai/sdk";
import { createSupabaseAdmin } from "@/lib/supabase/server";

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
  month: string
): Promise<MonthlyReportData> {
  const supabase = createSupabaseAdmin();
  const { start, end } = monthRange(month);

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
      .select("id, titel, ziel_typ, zielwert, erreicht_am, deadline, created_at")
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
      titel: g.titel,
      typ: g.ziel_typ,
      zielwert: g.zielwert,
      deadline: g.deadline,
      erreicht: !!g.erreicht_am,
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

Antworte AUSSCHLIESSLICH als gültiges JSON ohne Markdown-Codeblock:
{
  "summary": "...",
  "weightAnalysis": "...",
  "nutritionAnalysis": "...",
  "goalProgress": "...",
  "recommendations": ["...", "...", "..."]
}`;

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-5-20250929",
    max_tokens: 2000,
    messages: [{ role: "user", content: prompt }],
  });

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

/**
 * Run the monthly report generation for all premium users and persist.
 * Upserts into ea_monthly_reports keyed by (user_id, month).
 */
export async function runMonthlyReportsForAllPremium(month: string): Promise<{
  processed: number;
  failed: number;
}> {
  const supabase = createSupabaseAdmin();

  const { data: users, error } = await supabase
    .from("ea_users")
    .select("clerk_id")
    .in("subscription_plan", ["pro_plus", "admin"]);

  if (error || !users) {
    console.error("Could not load premium users:", error);
    return { processed: 0, failed: 0 };
  }

  let processed = 0;
  let failed = 0;

  for (const user of users) {
    try {
      const report = await generateMonthlyReport(user.clerk_id, month);
      const { error: upsertError } = await supabase
        .from("ea_monthly_reports")
        .upsert(
          {
            user_id: user.clerk_id,
            month,
            report_data: report,
          },
          { onConflict: "user_id,month" }
        );
      if (upsertError) {
        console.error(
          `Report upsert failed for ${user.clerk_id}:`,
          upsertError
        );
        failed++;
      } else {
        processed++;
      }
    } catch (e) {
      console.error(`Report generation failed for ${user.clerk_id}:`, e);
      failed++;
    }
  }

  return { processed, failed };
}
