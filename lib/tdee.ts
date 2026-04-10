/**
 * Calculate BMR, TDEE and target calories using the Mifflin-St Jeor formula.
 * Values for geschlecht/aktivitaet match the app's profile constants
 * (see types/index.ts).
 */

interface TDEEProfile {
  gewicht_kg?: number | null;
  groesse_cm?: number | null;
  alter_jahre?: number | null;
  geschlecht?: string | null;
  aktivitaet?: string | null;
  ziel?: string | null;
  target_weight?: number | null;
  target_timeframe?: string | null;
}

export type SafetyLevel = "safe" | "aggressive" | "dangerous" | "underweight";

export interface DeficitResult {
  dailyDeficit: number;
  targetCalories: number;
  weeklyLoss: number; // kg per week
  totalLoss: number; // kg total
  timeframeDays: number;
  safetyLevel: SafetyLevel;
  warning?: string;
}

export interface TDEEResult {
  bmr: number;
  tdee: number;
  target: number;
  pal: number;
  goal: "abnehmen" | "zunehmen" | "halten";
  goalDelta: number; // kcal diff from TDEE (negative = deficit)
  goalLabel: string;
  /** Populated only when target_weight + target_timeframe are set and the user wants to lose weight. */
  customDeficit?: DeficitResult;
}

export const TIMEFRAME_DAYS: Record<string, number> = {
  "3_months": 90,
  "6_months": 180,
  "9_months": 270,
  "12_months": 365,
};

export const TIMEFRAME_LABEL: Record<string, string> = {
  "3_months": "3 Monate",
  "6_months": "6 Monate",
  "9_months": "9 Monate",
  "12_months": "12 Monate",
  no_rush: "Kein Zeitdruck",
};

// App uses "maennlich" / "weiblich" / "divers". "divers" → average of both.
const PAL_FACTORS: Record<string, number> = {
  wenig: 1.375,
  moderat: 1.55,
  aktiv: 1.65,
  sehr_aktiv: 1.725,
  extrem_aktiv: 1.9,
  // English fallbacks just in case
  wenig_aktiv: 1.375,
  moderat_aktiv: 1.55,
};

/**
 * Berechnet ein individuelles Defizit aus Zielgewicht + Zeitraum.
 * 1 kg Fett ≈ 7700 kcal.
 * Safety-Level + Warnung basieren auf pro-Tag-Defizit und Minimum-Ziel-Kalorien.
 */
export function calculateDeficit(params: {
  currentWeight: number;
  targetWeight: number;
  timeframeDays: number;
  tdee: number;
  groesse_cm?: number | null;
  geschlecht?: string | null;
}): DeficitResult {
  const totalLoss = Math.max(params.currentWeight - params.targetWeight, 0);
  const totalCalories = totalLoss * 7700;
  const dailyDeficit = Math.round(totalCalories / params.timeframeDays);
  const weeklyLoss = (dailyDeficit * 7) / 7700;
  let targetCalories = params.tdee - dailyDeficit;

  let safetyLevel: SafetyLevel;
  let warning: string | undefined;

  if (dailyDeficit <= 500) {
    safetyLevel = "safe";
  } else if (dailyDeficit <= 750) {
    safetyLevel = "aggressive";
    warning =
      "Dieses Defizit ist ambitioniert. Achte auf ausreichend Protein und Mikronährstoffe.";
  } else if (dailyDeficit <= 1000) {
    safetyLevel = "dangerous";
    warning =
      "Ein Defizit über 750 kcal/Tag kann zu Muskelverlust, Nährstoffmangel und Jo-Jo-Effekt führen. Wir empfehlen einen längeren Zeitraum.";
  } else {
    safetyLevel = "dangerous";
    warning =
      "ACHTUNG: Dieses Defizit ist gesundheitlich bedenklich. Bitte wähle einen längeren Zeitraum oder ein realistischeres Zielgewicht.";
  }

  // Minimum floor: 1200 kcal (Frauen) / 1500 kcal (Männer)
  const geschlecht = (params.geschlecht || "").toLowerCase();
  const isMale =
    geschlecht === "maennlich" ||
    geschlecht === "männlich" ||
    geschlecht === "male";
  const minCalories = isMale ? 1500 : 1200;

  if (targetCalories < minCalories) {
    safetyLevel = "dangerous";
    warning = `Mit diesem Ziel würdest du unter ${minCalories} kcal/Tag kommen — das ist nicht empfehlenswert. Bitte passe Zeitraum oder Zielgewicht an.`;
    targetCalories = minCalories;
  }

  // BMI-Check: Zielgewicht zu niedrig?
  if (params.groesse_cm) {
    const heightM = params.groesse_cm / 100;
    const targetBmi = params.targetWeight / (heightM * heightM);
    if (targetBmi < 18.5) {
      safetyLevel = "underweight";
      warning = `Dein Zielgewicht entspricht einem BMI von ${targetBmi.toFixed(1)} (Untergewicht). Wir empfehlen dir, ein höheres Zielgewicht zu wählen.`;
    }
  }

  return {
    dailyDeficit,
    targetCalories: Math.round(targetCalories),
    weeklyLoss: Math.round(weeklyLoss * 100) / 100,
    totalLoss: Math.round(totalLoss * 10) / 10,
    timeframeDays: params.timeframeDays,
    safetyLevel,
    warning,
  };
}

export function calculateTDEE(profile: TDEEProfile): TDEEResult | null {
  const gewicht = Number(profile.gewicht_kg);
  const groesse = Number(profile.groesse_cm);
  const alter = Number(profile.alter_jahre);

  if (!gewicht || !groesse || !alter) return null;

  const geschlecht = (profile.geschlecht || "").toLowerCase();

  let bmr: number;
  if (geschlecht === "maennlich" || geschlecht === "männlich" || geschlecht === "male") {
    bmr = 10 * gewicht + 6.25 * groesse - 5 * alter + 5;
  } else if (
    geschlecht === "weiblich" ||
    geschlecht === "female"
  ) {
    bmr = 10 * gewicht + 6.25 * groesse - 5 * alter - 161;
  } else {
    // divers / unknown — average of both
    const male = 10 * gewicht + 6.25 * groesse - 5 * alter + 5;
    const female = 10 * gewicht + 6.25 * groesse - 5 * alter - 161;
    bmr = (male + female) / 2;
  }

  const pal = PAL_FACTORS[profile.aktivitaet || ""] ?? 1.55;
  const tdee = Math.round(bmr * pal);

  const ziel = (profile.ziel || "").toLowerCase();
  let goal: TDEEResult["goal"];
  let goalDelta: number;
  let goalLabel: string;

  if (ziel.includes("abnehm")) {
    goal = "abnehmen";
    goalDelta = -500;
    goalLabel = "Abnehmen (-500 kcal Defizit)";
  } else if (ziel.includes("muskel") || ziel.includes("zunehm")) {
    goal = "zunehmen";
    goalDelta = 300;
    goalLabel = "Zunehmen / Muskelaufbau (+300 kcal)";
  } else {
    goal = "halten";
    goalDelta = 0;
    goalLabel = "Gewicht halten";
  }

  // Safety floor: never drop below 1200 kcal
  let target = Math.max(tdee + goalDelta, 1200);

  // ---- Custom deficit aus Wunschgewicht + Zeitraum ----
  // Überschreibt die pauschale -500 kcal für Abnehmen, sofern sinnvoll.
  let customDeficit: DeficitResult | undefined;
  if (
    goal === "abnehmen" &&
    profile.target_weight &&
    profile.target_timeframe &&
    profile.target_timeframe !== "no_rush"
  ) {
    const timeframeDays = TIMEFRAME_DAYS[profile.target_timeframe];
    if (timeframeDays && Number(profile.target_weight) < gewicht) {
      customDeficit = calculateDeficit({
        currentWeight: gewicht,
        targetWeight: Number(profile.target_weight),
        timeframeDays,
        tdee,
        groesse_cm: profile.groesse_cm,
        geschlecht: profile.geschlecht,
      });
      // Nur anwenden wenn nicht "dangerous/underweight" — sonst bleibt pauschales -500
      if (
        customDeficit.safetyLevel === "safe" ||
        customDeficit.safetyLevel === "aggressive"
      ) {
        target = customDeficit.targetCalories;
        goalDelta = target - tdee;
        const tfLabel = TIMEFRAME_LABEL[profile.target_timeframe];
        goalLabel = `Abnehmen (${customDeficit.totalLoss} kg in ${tfLabel}, -${customDeficit.dailyDeficit} kcal/Tag)`;
      }
    }
  }

  return {
    bmr: Math.round(bmr),
    tdee,
    target,
    pal,
    goal,
    goalDelta,
    goalLabel,
    customDeficit,
  };
}
