import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Loads the user's recent behavioral data (food diary, weight trend, goals)
 * and formats it as context for the AI system prompt.
 */
export async function loadUserBehaviorContext(
  supabase: SupabaseClient,
  userId: string
): Promise<string> {
  const parts: string[] = [];

  // Run all queries in parallel
  const [foodLogResult, weightResult, goalsResult, profileResult] = await Promise.all([
    // Last 7 days of food diary
    supabase
      .from("ea_food_log")
      .select("mahlzeit_typ, beschreibung, kalorien_geschaetzt, protein_g, carbs_g, fat_g, datum")
      .eq("user_id", userId)
      .gte("datum", daysAgo(7))
      .order("datum", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(50),

    // Last 30 days of weight logs
    supabase
      .from("ea_weight_logs")
      .select("gewicht_kg, notiz, gemessen_am")
      .eq("user_id", userId)
      .gte("gemessen_am", daysAgo(30))
      .order("gemessen_am", { ascending: false })
      .limit(15),

    // Active (not achieved) goals
    supabase
      .from("ea_ziele")
      .select("typ, beschreibung, zielwert, startwert, einheit, zieldatum, erreicht")
      .eq("user_id", userId)
      .eq("erreicht", false)
      .limit(10),

    // Profile — for start weight / goal progress
    supabase
      .from("ea_profiles")
      .select("gewicht_kg, groesse_cm, ziel")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  const profile = profileResult.data as
    | { gewicht_kg: number | null; groesse_cm: number | null; ziel: string | null }
    | null;

  // --- Food diary context ---
  if (foodLogResult.data?.length) {
    type FoodEntry = {
      mahlzeit_typ: string;
      beschreibung: string;
      kalorien_geschaetzt: number | null;
      protein_g: number | null;
      carbs_g: number | null;
      fat_g: number | null;
      datum: string;
    };
    const entries = foodLogResult.data as FoodEntry[];
    const byDay: Record<string, FoodEntry[]> = {};
    for (const e of entries) {
      if (!byDay[e.datum]) byDay[e.datum] = [];
      byDay[e.datum].push(e);
    }

    const dayLines: string[] = [];
    for (const day of Object.keys(byDay)) {
      const meals = byDay[day];
      const mealSummary = meals
        .map((m: FoodEntry) => {
          const kcal = m.kalorien_geschaetzt ? ` (~${m.kalorien_geschaetzt} kcal)` : "";
          const macroParts: string[] = [];
          if (m.protein_g != null) macroParts.push(`${m.protein_g}g P`);
          if (m.carbs_g != null) macroParts.push(`${m.carbs_g}g C`);
          if (m.fat_g != null) macroParts.push(`${m.fat_g}g F`);
          const macros = macroParts.length ? ` (${macroParts.join(", ")})` : "";
          return `  - ${mealLabel(m.mahlzeit_typ)}: ${m.beschreibung}${kcal}${macros}`;
        })
        .join("\n");

      const totalKcal = meals.reduce((s: number, m: FoodEntry) => s + (m.kalorien_geschaetzt || 0), 0);
      const kcalNote = totalKcal > 0 ? ` (gesamt ~${totalKcal} kcal)` : "";
      dayLines.push(`${formatDate(day)}${kcalNote}:\n${mealSummary}`);
    }

    parts.push(`ERNÄHRUNGSTAGEBUCH (letzte 7 Tage):\n${dayLines.join("\n\n")}`);

    // --- Macro averages (7-day) ---
    const logsWithMacros = entries.filter(
      (f) => f.protein_g != null || f.carbs_g != null || f.fat_g != null
    );
    if (logsWithMacros.length >= 3) {
      const days = Object.keys(byDay).length || 1;
      const totalP = logsWithMacros.reduce((s, f) => s + (f.protein_g || 0), 0);
      const totalC = logsWithMacros.reduce((s, f) => s + (f.carbs_g || 0), 0);
      const totalF = logsWithMacros.reduce((s, f) => s + (f.fat_g || 0), 0);
      const totalKcal = entries.reduce((s, f) => s + (f.kalorien_geschaetzt || 0), 0);
      const avgP = Math.round(totalP / days);
      const avgC = Math.round(totalC / days);
      const avgF = Math.round(totalF / days);
      const avgKcal = Math.round(totalKcal / days);

      const macroLines = [
        `  - Ø Kalorien: ~${avgKcal} kcal/Tag`,
        `  - Ø Protein: ~${avgP} g/Tag`,
        `  - Ø Kohlenhydrate: ~${avgC} g/Tag`,
        `  - Ø Fett: ~${avgF} g/Tag`,
      ];

      // Protein minimum warning (1.2 g/kg Körpergewicht als untere Richtlinie)
      if (profile?.gewicht_kg) {
        const proteinMin = Math.round(profile.gewicht_kg * 1.2);
        if (avgP < proteinMin) {
          macroLines.push(
            `  - ⚠️ Protein unter Richtwert (${proteinMin} g/Tag bei ${profile.gewicht_kg} kg Körpergewicht)`
          );
        }
      }

      parts.push(`MAKRO-DURCHSCHNITT (7 Tage):\n${macroLines.join("\n")}`);
    }
  }

  // --- Weight trend context ---
  if (weightResult.data?.length) {
    const weights = weightResult.data;
    const weightLines = weights
      .slice(0, 5) // Show last 5 entries
      .map((w) => `  - ${formatDate(w.gemessen_am)}: ${w.gewicht_kg} kg${w.notiz ? ` (${w.notiz})` : ""}`)
      .join("\n");

    let trendNote = "";
    if (weights.length >= 2) {
      const newest = weights[0].gewicht_kg;
      const oldest = weights[weights.length - 1].gewicht_kg;
      const diff = newest - oldest;
      const days = daysBetween(weights[weights.length - 1].gemessen_am, weights[0].gemessen_am);
      if (days > 0) {
        const direction = diff > 0.2 ? "zugenommen" : diff < -0.2 ? "abgenommen" : "stabil geblieben";
        trendNote = `\nTrend: ${Math.abs(diff).toFixed(1)} kg ${direction} in ${days} Tagen`;
      }
    }

    parts.push(`GEWICHTSVERLAUF (letzte Einträge):\n${weightLines}${trendNote}`);
  }

  // --- Active goals context ---
  if (goalsResult.data?.length) {
    const goalLines = goalsResult.data
      .map((g) => {
        const target = g.zielwert ? ` (Ziel: ${g.zielwert}${g.einheit ? ` ${g.einheit}` : ""})` : "";
        const deadline = g.zieldatum ? ` bis ${formatDate(g.zieldatum)}` : "";
        return `  - ${g.beschreibung || g.typ}${target}${deadline}`;
      })
      .join("\n");

    parts.push(`AKTIVE ZIELE:\n${goalLines}`);
  }

  // --- Goal progress tracker (weight goals) ---
  if (weightResult.data?.length && goalsResult.data?.length) {
    const weightGoal = goalsResult.data.find(
      (g) =>
        g.typ === "gewicht" ||
        (typeof g.beschreibung === "string" && /gewicht|kg|abnehm|zunehm/i.test(g.beschreibung))
    );
    if (weightGoal?.zielwert) {
      const weights = weightResult.data;
      const currentWeight = weights[0].gewicht_kg;
      const startWeight =
        weightGoal.startwert ?? profile?.gewicht_kg ?? weights[weights.length - 1].gewicht_kg;
      const targetWeight = weightGoal.zielwert;

      const totalDelta = targetWeight - startWeight;
      const currentDelta = currentWeight - startWeight;
      const progressPercent =
        Math.abs(totalDelta) > 0.01
          ? Math.round((currentDelta / totalDelta) * 100)
          : 0;

      const progressLines = [
        `  - Start: ${startWeight} kg → Aktuell: ${currentWeight} kg → Ziel: ${targetWeight} kg`,
        `  - Fortschritt: ${progressPercent}% (${currentDelta > 0 ? "+" : ""}${currentDelta.toFixed(1)} kg von ${totalDelta > 0 ? "+" : ""}${totalDelta.toFixed(1)} kg)`,
      ];

      // Weekly rate check — warn if >1.0 kg/week (zu aggressiv)
      if (weights.length >= 2) {
        const oldest = weights[weights.length - 1].gewicht_kg;
        const days = daysBetween(
          weights[weights.length - 1].gemessen_am,
          weights[0].gemessen_am
        );
        if (days >= 7) {
          const weeklyRate = ((currentWeight - oldest) / days) * 7;
          if (Math.abs(weeklyRate) > 1.0) {
            progressLines.push(
              `  - ⚠️ Aktuelles Tempo: ${weeklyRate > 0 ? "+" : ""}${weeklyRate.toFixed(1)} kg/Woche (über gesundem Richtwert von max. 1 kg/Woche)`
            );
          }
        }
      }

      parts.push(`ZIEL-FORTSCHRITT:\n${progressLines.join("\n")}`);
    }
  }

  return parts.join("\n\n");
}

// --- Helpers ---

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA).getTime();
  const b = new Date(dateB).getTime();
  return Math.round(Math.abs(b - a) / (1000 * 60 * 60 * 24));
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("de-DE", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function mealLabel(typ: string): string {
  const labels: Record<string, string> = {
    fruehstueck: "Frühstück",
    mittag: "Mittagessen",
    abend: "Abendessen",
    snack: "Snack",
  };
  return labels[typ] || typ;
}
