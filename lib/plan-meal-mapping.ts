import type { TagebuchMealSlot } from "@/types";

/**
 * Mappt einen frei vom LLM generierten Plan-Mahlzeit-Typ ("Frühstück",
 * "Snack 1", "Erste Mahlzeit", "Hauptmahlzeit", ...) auf die 4 strikten
 * Tagebuch-Slots. Optional zieht die Uhrzeit als Tiebreaker, falls der
 * Plan-Typ generisch ist (passiert bei Fasten-Modellen mit 1-2 Mahlzeiten).
 *
 * Default bei Unklarheit: snack — bewusst defensiv, ein Snack-Eintrag ist
 * harmloser als ein falsch zugeordnetes Mittag/Abend.
 */
export function mapPlanMealTypeToTagebuch(
  planType: string | undefined | null,
  time?: string | undefined | null
): TagebuchMealSlot {
  const t = (planType || "").toLowerCase().trim();

  if (/(frühstück|fruehstueck|breakfast|morgen)/.test(t)) return "fruehstueck";
  if (/(mittag|lunch)/.test(t)) return "mittag";
  if (/(abend|dinner)/.test(t)) return "abend";
  if (/(snack|zwischen|imbiss)/.test(t)) return "snack";

  // Generische Plan-Labels für Fasten-Modelle ("Erste Mahlzeit",
  // "Hauptmahlzeit", "Zweite Mahlzeit") → Uhrzeit entscheidet.
  const hour = parseHour(time);
  if (hour != null) {
    if (hour < 11) return "fruehstueck";
    if (hour < 15) return "mittag";
    if (hour < 20) return "abend";
    return "snack";
  }

  return "snack";
}

function parseHour(time: string | undefined | null): number | null {
  if (!time) return null;
  const m = /^(\d{1,2}):/.exec(time);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  if (isNaN(h) || h < 0 || h > 23) return null;
  return h;
}
