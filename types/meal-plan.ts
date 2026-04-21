export interface MealRecipe {
  ingredients: string[];
  steps: string[];
  prepTime: string;
  mealPrepNote?: string;
}

export interface Meal {
  type: string;
  time: string;
  name: string;
  shortDescription: string;
  calories?: number;
  fullRecipe: MealRecipe;
}

export interface DayMacros {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface DayPlan {
  day: string;
  meals: Meal[];
  targetCalories?: number;
  actualCalories?: number;
  /**
   * Optional: Gesamtsumme der Makros für diesen Tag. Wird von der
   * Plan-Generierung seit Feature B mit erzeugt. Ältere Pläne ohne
   * dieses Feld bekommen im Tagebuch einen 25/50/25-Fallback berechnet.
   */
  macros?: DayMacros;
}

export interface MealPrepPlan {
  prepDay: string;
  tasks: string[];
}

export interface WeekPlanData {
  weekPlan: DayPlan[];
  shoppingList: string[];
  mealPrepPlan?: MealPrepPlan;
  dailyTarget?: number;
  calculationBasis?: string;
}

export interface PlanParameters {
  days?: number;
  fasting: string;
  mealsPerDay: number;
  timing: Record<string, string>;
  flexibleTiming: boolean;
  mealprep: boolean;
  mealPrepDays?: number;
  periodicEatDays?: number;
  periodicFastDays?: number;
  userMessage?: string;
}

export const FASTING_OPTIONS = [
  { value: "none", label: "Kein Fasten" },
  { value: "16:8", label: "16:8 Intervallfasten" },
  { value: "20:4", label: "20:4 Intervallfasten" },
  { value: "5:2", label: "5:2 Fasten" },
  { value: "1:1", label: "1:1 Fasten (Alternate Day)" },
  { value: "periodic", label: "Periodisches Fasten (mehrtägig)" },
] as const;

export const MEAL_LABELS: Record<number, string[]> = {
  1: ["Hauptmahlzeit"],
  2: ["Erste Mahlzeit", "Zweite Mahlzeit"],
  3: ["Frühstück", "Mittagessen", "Abendessen"],
  4: ["Frühstück", "Mittagessen", "Snack", "Abendessen"],
  5: ["Frühstück", "Snack 1", "Mittagessen", "Snack 2", "Abendessen"],
};

export const TIMING_RANGES: Record<string, { start: number; end: number }> = {
  "Frühstück": { start: 6, end: 10 },
  "Erste Mahlzeit": { start: 6, end: 14 },
  "Mittagessen": { start: 11, end: 14 },
  "Zweite Mahlzeit": { start: 16, end: 21 },
  "Snack": { start: 10, end: 18 },
  "Snack 1": { start: 10, end: 12 },
  "Snack 2": { start: 15, end: 17 },
  "Abendessen": { start: 17, end: 21 },
};
