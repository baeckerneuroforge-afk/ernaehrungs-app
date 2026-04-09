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
}

export interface TDEEResult {
  bmr: number;
  tdee: number;
  target: number;
  pal: number;
  goal: "abnehmen" | "zunehmen" | "halten";
  goalDelta: number; // kcal diff from TDEE (negative = deficit)
  goalLabel: string;
}

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
  const target = Math.max(tdee + goalDelta, 1200);

  return {
    bmr: Math.round(bmr),
    tdee,
    target,
    pal,
    goal,
    goalDelta,
    goalLabel,
  };
}
