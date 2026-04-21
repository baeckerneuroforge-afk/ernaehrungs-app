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
 * die präzisen Kalorien-Ziele vor. Höchste Priorität vor calorie_target/TDEE.
 *
 * Bewusst OHNE Makro-Ziele: Wir zeigen im Tagebuch nur Ist-Werte für
 * Makros, keine Soll-Werte. Siehe Kommentar unten bei DailyTargets.
 */
export interface PlanDayTarget {
  /** Gesamtkalorien für diesen Tag laut Plan. Pflicht. */
  targetCalories: number;
  /** Info für UI-Badge: "Tag X von Y". */
  dayNumber: number;
  totalDays: number;
}

export type TargetSource =
  | "active_plan" //     Tag des aktiven Ernährungsplans (höchste Priorität)
  | "calorie_rechner" // Manuell im Tool gesetzt
  | "profile_goal" //    TDEE + default Adjustment basierend auf "ziel"
  | "none"; //            Profil zu dünn für Berechnung

/**
 * Tages-Zielvorgaben fürs Tagebuch.
 *
 * Enthält BEWUSST nur Kalorien — keine Makro-Ziele. Das Kalorienziel
 * kommt aus einer individualisierten Quelle (Kalorienrechner,
 * Plan-Tag, oder TDEE-Schätzung mit User-Zielrichtung). Makros dagegen
 * würden eine allgemeine Empfehlung implizieren (25/50/25 oder ähnlich)
 * — das wollen wir nicht: die App gibt keine Ernährungs-Empfehlungen
 * ab, sondern trackt nur. Im UI werden Makros als Ist-Werte ohne
 * Balken und ohne Ziel gezeigt.
 */
export interface DailyTargets {
  targetKcal: number;
  source: TargetSource;
  /** Nur befüllt wenn source === "active_plan". */
  planInfo?: {
    dayNumber: number;
    totalDays: number;
  };
}

/**
 * Minimaler plausibler Target-Wert. Unterhalb dessen zeigen wir
 * keinen Balken — das wäre kein gesundes Ziel mehr.
 */
const MIN_PLAUSIBLE_KCAL = 1200;

/**
 * Berechnet das Tages-Kalorienziel.
 *
 * Priorität:
 *   1. planDay — Tag des aktiven Ernährungsplans
 *   2. profile.calorie_target — manuell gesetzt via Kalorienrechner
 *   3. calculateTDEE() + Adjustment aus profile.ziel
 *   4. null — wenn Profil zu dünn für irgendeine Berechnung ist
 */
export function calculateDailyTargets(
  profile: TargetProfileInput,
  planDay: PlanDayTarget | null = null
): DailyTargets | null {
  // 1. Aktiver Plan-Tag hat höchste Priorität.
  if (planDay && planDay.targetCalories >= MIN_PLAUSIBLE_KCAL) {
    return {
      targetKcal: Math.round(planDay.targetCalories),
      source: "active_plan",
      planInfo: {
        dayNumber: planDay.dayNumber,
        totalDays: planDay.totalDays,
      },
    };
  }

  // 2. Kalorienrechner-Wert
  if (
    typeof profile.calorie_target === "number" &&
    profile.calorie_target >= MIN_PLAUSIBLE_KCAL
  ) {
    return {
      targetKcal: Math.round(profile.calorie_target),
      source: "calorie_rechner",
    };
  }

  // 3. TDEE-Fallback
  const tdeeResult = calculateTDEE({
    alter_jahre: profile.alter_jahre,
    geschlecht: profile.geschlecht,
    groesse_cm: profile.groesse_cm,
    gewicht_kg: profile.gewicht_kg,
    aktivitaet: profile.aktivitaet,
    ziel: profile.ziel,
  });
  if (tdeeResult && tdeeResult.target >= MIN_PLAUSIBLE_KCAL) {
    return {
      targetKcal: Math.round(tdeeResult.target),
      source: "profile_goal",
    };
  }

  return null;
}

/**
 * Farbstufen für den Kalorien-Balken. Stufen entsprechen den Labels
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
