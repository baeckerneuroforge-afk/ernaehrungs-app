import { mapPlanMealTypeToTagebuch } from "@/lib/plan-meal-mapping";
import { calendarDaysBetween, isoToCalendarDate } from "@/lib/local-date";
import type { TagebuchMealSlot } from "@/types";
import type { WeekPlanData } from "@/types/meal-plan";

/**
 * Eine Plan-Mahlzeit in der Form, in der das Tagebuch sie braucht —
 * mit fertig gemapptem Tagebuch-Slot und Position-Ref. Plan-Mahlzeiten
 * haben selbst keine ID; "ref" = "dayIndex:mealIndex" identifiziert sie
 * stabil im plan_data.weekPlan-Array.
 */
export interface ActivePlanMeal {
  mealIndex: number;
  ref: string;
  type: string;
  time: string;
  slot: TagebuchMealSlot;
  name: string;
  shortDescription: string;
  calories: number | null;
  /**
   * Pro-Meal-Makros in Gramm. Werden vom Plan-Generator seit dem
   * Macros-per-Meal-Update mit erzeugt; ältere Pläne liefern hier
   * null und das UI fällt auf "nur kcal" zurück.
   */
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}

export interface ActivePlanDay {
  dayIndex: number;
  label: string;
  meals: ActivePlanMeal[];
}

export interface ActivePlanForTagebuch {
  id: string;
  totalDays: number;
  /** null wenn Plan abgelaufen (heute > totalDays). */
  todayDayIndex: number | null;
  days: ActivePlanDay[];
}

/**
 * Macht aus dem rohen plan_data ein Tagebuch-taugliches Objekt. Wenn
 * der Plan keine verwertbaren Mahlzeiten hat (leer, kaputt), null.
 */
export function buildActivePlanForTagebuch(
  planId: string,
  planData: WeekPlanData | null | undefined,
  createdAt: string,
  todayIso: string
): ActivePlanForTagebuch | null {
  const rawDays = Array.isArray(planData?.weekPlan) ? planData!.weekPlan : [];
  if (rawDays.length === 0) return null;

  // Tag 0 == Erstell-Kalendertag (Europe/Berlin). Day delta via noon-UTC
  // anchors so DST does not shift the index.
  const startIso = isoToCalendarDate(createdAt);
  const dayIndex = calendarDaysBetween(startIso, todayIso);
  const todayDayIndex = dayIndex >= 0 && dayIndex < rawDays.length ? dayIndex : null;

  const days: ActivePlanDay[] = rawDays.map((d, di) => ({
    dayIndex: di,
    label: d?.day || `Tag ${di + 1}`,
    meals: Array.isArray(d?.meals)
      ? d.meals.map((m, mi) => ({
          mealIndex: mi,
          ref: `${di}:${mi}`,
          type: m?.type || "",
          time: m?.time || "",
          slot: mapPlanMealTypeToTagebuch(m?.type, m?.time),
          name: m?.name || "",
          shortDescription: m?.shortDescription || "",
          calories:
            typeof m?.calories === "number" && m.calories > 0
              ? Math.round(m.calories)
              : null,
          protein: sanitizeMacro(m?.protein),
          carbs: sanitizeMacro(m?.carbs),
          fat: sanitizeMacro(m?.fat),
        }))
      : [],
  }));

  return {
    id: planId,
    totalDays: rawDays.length,
    todayDayIndex,
    days,
  };
}

/**
 * Plan-Mahlzeit-Makro normalisieren: alles was keine endliche, positive
 * Zahl ist (LLM-Strings, Bereiche, null/undefined), wird zu null. Eine
 * Nachkommastelle reicht — Tagebuch zeigt eh nur gerundete Werte.
 */
function sanitizeMacro(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return null;
  return Math.round(v * 10) / 10;
}

/**
 * Stats-Zeile für eine Plan-Mahlzeit: "380 kcal · 14g E · 58g K · 9g F",
 * dropt Felder die null sind. Gibt null zurück wenn alle Werte fehlen —
 * dann sollte das UI die Zeile gar nicht rendern. Für alte Pläne ohne
 * Makros bleibt nur die kcal-Zeile.
 */
export function formatMealStats(meal: {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
}): string | null {
  const parts: string[] = [];
  if (meal.calories != null) parts.push(`${meal.calories} kcal`);
  if (meal.protein != null) parts.push(`${formatGrams(meal.protein)}g E`);
  if (meal.carbs != null) parts.push(`${formatGrams(meal.carbs)}g K`);
  if (meal.fat != null) parts.push(`${formatGrams(meal.fat)}g F`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

function formatGrams(n: number): string {
  // Ganze Zahl wenn integer, sonst eine Nachkommastelle.
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/**
 * Aggregierte Tagessumme aus den Pro-Meal-Werten. Bewusst generisch
 * über Meal-Form (raw types/meal-plan.ts `Meal` mit optionalen number?-
 * Feldern UND ActivePlanMeal mit number|null-Feldern) — gleiche
 * Logik in beiden Welten.
 *
 * Verhalten:
 *  - Fehlende Werte (null/undefined/NaN/negativ) zählen als 0 für die
 *    Summe, aber sie kippen hasMacros nicht auf true.
 *  - hasMacros = mindestens eine Mahlzeit hat MINDESTENS eines der drei
 *    Makro-Felder als valide Zahl gesetzt. UIs sollen die Makro-Zeile
 *    nur rendern wenn hasMacros true ist; sonst reicht die kcal-Zeile.
 *  - kcal ist getrennt behandelt: kcal-Summe kann auch ohne Makros
 *    sinnvoll sein (alte Pläne).
 */
export interface DayMacroTotals {
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  hasMacros: boolean;
}

type MealMacroInput = {
  calories?: number | null;
  protein?: number | null;
  carbs?: number | null;
  fat?: number | null;
};

export function calculateDayMacros(
  meals: ReadonlyArray<MealMacroInput>
): DayMacroTotals {
  let kcalSum = 0;
  let kcalSeen = false;
  let proteinSum = 0;
  let proteinSeen = false;
  let carbsSum = 0;
  let carbsSeen = false;
  let fatSum = 0;
  let fatSeen = false;

  for (const m of meals) {
    const c = pickPositiveNumber(m?.calories);
    if (c != null) {
      kcalSum += c;
      kcalSeen = true;
    }
    const p = pickPositiveNumber(m?.protein);
    if (p != null) {
      proteinSum += p;
      proteinSeen = true;
    }
    const k = pickPositiveNumber(m?.carbs);
    if (k != null) {
      carbsSum += k;
      carbsSeen = true;
    }
    const f = pickPositiveNumber(m?.fat);
    if (f != null) {
      fatSum += f;
      fatSeen = true;
    }
  }

  return {
    kcal: kcalSeen ? Math.round(kcalSum) : null,
    protein: proteinSeen ? Math.round(proteinSum * 10) / 10 : null,
    carbs: carbsSeen ? Math.round(carbsSum * 10) / 10 : null,
    fat: fatSeen ? Math.round(fatSum * 10) / 10 : null,
    hasMacros: proteinSeen || carbsSeen || fatSeen,
  };
}

function pickPositiveNumber(v: unknown): number | null {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return null;
  return v;
}

/**
 * Day-Stats für UI mit kcal: "1.840 kcal · 105g E · 210g K · 65g F".
 * Tagessummen sind größere Zahlen — kcal mit deutschem Tausender-
 * Trenner. Gibt null wenn der Tag komplett leer ist.
 */
export function formatDayStats(totals: DayMacroTotals): string | null {
  const parts: string[] = [];
  if (totals.kcal != null) parts.push(`${totals.kcal.toLocaleString("de-DE")} kcal`);
  if (totals.protein != null) parts.push(`${formatGrams(totals.protein)}g E`);
  if (totals.carbs != null) parts.push(`${formatGrams(totals.carbs)}g K`);
  if (totals.fat != null) parts.push(`${formatGrams(totals.fat)}g F`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * Nur die Makros, ohne kcal — für UIs die kcal schon woanders zeigen
 * (z.B. die kcal-Ampel-Chip in WeekGrid). Gibt null wenn hasMacros
 * false ist; UIs sollen die Zeile dann gar nicht rendern.
 */
export function formatDayMacros(totals: DayMacroTotals): string | null {
  if (!totals.hasMacros) return null;
  const parts: string[] = [];
  if (totals.protein != null) parts.push(`${formatGrams(totals.protein)}g E`);
  if (totals.carbs != null) parts.push(`${formatGrams(totals.carbs)}g K`);
  if (totals.fat != null) parts.push(`${formatGrams(totals.fat)}g F`);
  return parts.length > 0 ? parts.join(" · ") : null;
}
