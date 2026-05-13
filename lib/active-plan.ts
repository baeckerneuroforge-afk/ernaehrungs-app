import { mapPlanMealTypeToTagebuch } from "@/lib/plan-meal-mapping";
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

  // Tag 0 == Erstell-Tag, lokale Zeit, auf 00:00 normalisiert. So
  // verschiebt sich der Index nicht über DST-Wechsel oder Uhrzeit-
  // Unterschiede beim Insert.
  const start = new Date(createdAt);
  start.setHours(0, 0, 0, 0);
  const today = new Date(todayIso + "T00:00:00");
  const dayIndex = Math.floor(
    (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
  );
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
