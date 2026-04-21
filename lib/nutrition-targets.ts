import { calculateTDEE } from "@/lib/tdee";

/**
 * Pulled from the ea_profiles/ea_users row; only the fields we actually
 * need for targeting. Keeps this module independent of the big Profile
 * interface in types/.
 */
export interface TargetProfileInput {
  alter_jahre?: number | null;
  geschlecht?: string | null;
  groesse_cm?: number | null;
  gewicht_kg?: number | null;
  aktivitaet?: string | null;
  ziel?: string | null;
  /** Manueller Wert aus /tools/kalorienrechner, hat Vorrang gegenüber TDEE. */
  calorie_target?: number | null;
  /** Optional: user-eingestelltes Adjustment relativ zu TDEE (kcal). */
  calorie_adjustment?: number | null;
}

/**
 * Ein einzelner Tag aus dem aktiven Ernährungsplan — gibt dem Tagebuch
 * die präzisen Ziele vor. Höchste Priorität vor calorie_target/TDEE.
 */
export interface PlanDayTarget {
  /** Gesamtkalorien für diesen Tag laut Plan. Pflicht. */
  targetCalories: number;
  /** Optional: Makros pro Tag. Fehlt bei älteren Plänen → 25/50/25-Fallback. */
  macros?: {
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  /** Info für UI-Badge: "Tag X von Y". */
  dayNumber: number;
  totalDays: number;
}

export type TargetSource =
  | "active_plan" //     Tag des aktiven Ernährungsplans (höchste Priorität)
  | "calorie_rechner" // Manuell im Tool gesetzt
  | "profile_goal" //    TDEE + default Adjustment basierend auf "ziel"
  | "none"; //            Profil zu dünn für Berechnung

export interface DailyTargets {
  targetKcal: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  source: TargetSource;
  /** Nur befüllt wenn source === "active_plan". */
  planInfo?: {
    dayNumber: number;
    totalDays: number;
  };
}

/**
 * Default Makro-Verteilung für ALLE User (keine krankheitsbasierte
 * Automatik — das wäre medizinische Beratung und ist explizit in den
 * AGB ausgeschlossen). Eine manuelle Anpassung durch den User
 * (Custom-Percent-Felder) kommt in einem späteren Feature.
 *
 * Rationale: 25/50/25 ist eine breit anerkannte, ausgewogene Baseline,
 * die weder Low-Carb noch High-Protein stark zieht und in den meisten
 * Ernährungs-Lehrbüchern als Einstieg gilt.
 */
const DEFAULT_MACRO_SPLIT = {
  protein: 0.25,
  carbs: 0.5,
  fat: 0.25,
} as const;

/**
 * Kalorien pro Gramm (physikalisch konstant — Atwater-Werte).
 */
const KCAL_PER_GRAM = {
  protein: 4,
  carbs: 4,
  fat: 9,
} as const;

/**
 * Minimaler plausibler Target-Wert. Unterhalb dessen zeigen wir
 * keine Balken — das wäre kein gesundes Ziel mehr.
 */
const MIN_PLAUSIBLE_KCAL = 1200;

/**
 * Berechnet die Tagesziele für Kalorien + drei Makros.
 *
 * Priorität:
 *   1. planDay — Tag des aktiven Ernährungsplans (Feature B)
 *   2. profile.calorie_target — manuell gesetzt via Kalorienrechner
 *   3. calculateTDEE() + Adjustment aus profile.ziel
 *   4. null — wenn das Profil zu dünn für irgendeine Berechnung ist
 */
export function calculateDailyTargets(
  profile: TargetProfileInput,
  planDay: PlanDayTarget | null = null
): DailyTargets | null {
  // 1. Aktiver Plan-Tag hat höchste Priorität — wenn vorhanden, überschreibt
  // er alle sonstigen Profildaten. Begründung: Der User hat sich aktiv für
  // einen Plan entschieden, dieser ist kalorie- und makroseitig kuratiert.
  if (planDay && planDay.targetCalories >= MIN_PLAUSIBLE_KCAL) {
    const targetKcal = Math.round(planDay.targetCalories);
    // Wenn der Plan keine Makros mitliefert (ältere Pläne vor Feature B),
    // fallen wir auf den 25/50/25-Default zurück — dann kennt der Balken
    // wenigstens korrekte Zielzahlen für die Makro-Bars.
    const m = planDay.macros;
    const targetProtein =
      m?.protein_g != null && m.protein_g > 0
        ? Math.round(m.protein_g)
        : Math.round(
            (targetKcal * DEFAULT_MACRO_SPLIT.protein) / KCAL_PER_GRAM.protein
          );
    const targetCarbs =
      m?.carbs_g != null && m.carbs_g > 0
        ? Math.round(m.carbs_g)
        : Math.round(
            (targetKcal * DEFAULT_MACRO_SPLIT.carbs) / KCAL_PER_GRAM.carbs
          );
    const targetFat =
      m?.fat_g != null && m.fat_g > 0
        ? Math.round(m.fat_g)
        : Math.round(
            (targetKcal * DEFAULT_MACRO_SPLIT.fat) / KCAL_PER_GRAM.fat
          );

    return {
      targetKcal,
      targetProtein,
      targetCarbs,
      targetFat,
      source: "active_plan",
      planInfo: {
        dayNumber: planDay.dayNumber,
        totalDays: planDay.totalDays,
      },
    };
  }

  let targetKcal: number | null = null;
  let source: TargetSource = "none";

  // 2. Expliziter Wert aus Kalorienrechner
  if (
    typeof profile.calorie_target === "number" &&
    profile.calorie_target >= MIN_PLAUSIBLE_KCAL
  ) {
    targetKcal = Math.round(profile.calorie_target);
    source = "calorie_rechner";
  } else {
    // 3. TDEE-Fallback — braucht alter/geschlecht/größe/gewicht/aktivität
    const tdeeResult = calculateTDEE({
      alter_jahre: profile.alter_jahre,
      geschlecht: profile.geschlecht,
      groesse_cm: profile.groesse_cm,
      gewicht_kg: profile.gewicht_kg,
      aktivitaet: profile.aktivitaet,
      ziel: profile.ziel,
    });
    if (tdeeResult && tdeeResult.target >= MIN_PLAUSIBLE_KCAL) {
      targetKcal = Math.round(tdeeResult.target);
      source = "profile_goal";
    }
  }

  if (targetKcal === null) return null;

  // Makro-Split — 25/50/25 als Default für alle.
  const { protein, carbs, fat } = DEFAULT_MACRO_SPLIT;
  const targetProtein = Math.round((targetKcal * protein) / KCAL_PER_GRAM.protein);
  const targetCarbs = Math.round((targetKcal * carbs) / KCAL_PER_GRAM.carbs);
  const targetFat = Math.round((targetKcal * fat) / KCAL_PER_GRAM.fat);

  return {
    targetKcal,
    targetProtein,
    targetCarbs,
    targetFat,
    source,
  };
}

/**
 * Farbschicht für den Kalorien-Balken. Stufen entsprechen den Labels
 * in der UI — der Component-Layer wendet sie auf die Balken-Farbe und
 * die Text-Farbe der Sub-Zeile an.
 */
export type CalorieStatus =
  | "low" //      < 80% vom Ziel
  | "in_range" // 80–105% (im Ziel)
  | "slightly_over" // 105–115%
  | "over"; //    > 115%

export function calorieStatus(consumed: number, target: number): CalorieStatus {
  if (target <= 0) return "low";
  const pct = (consumed / target) * 100;
  if (pct < 80) return "low";
  if (pct <= 105) return "in_range";
  if (pct <= 115) return "slightly_over";
  return "over";
}
