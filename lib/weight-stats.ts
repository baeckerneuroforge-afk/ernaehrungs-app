import type { WeightLog } from "@/types";

export type RangeKey = "week" | "month" | "3months" | "year" | "all";

export const RANGE_DAYS: Record<RangeKey, number | null> = {
  week: 7,
  month: 30,
  "3months": 90,
  year: 365,
  all: null,
};

/**
 * Take logs sorted ascending by gemessen_am and return only those within the
 * given range. `range === "all"` returns everything.
 */
export function filterByRange(
  logs: WeightLog[],
  range: RangeKey,
  now: Date = new Date()
): WeightLog[] {
  const days = RANGE_DAYS[range];
  if (days === null) return logs;
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  return logs.filter((l) => l.gemessen_am >= cutoffStr);
}

/**
 * Rolling 7-day mean — emits a parallel array of weights (or null when there
 * aren't enough points to smooth that position). Used as a trend line in the
 * chart so day-to-day water-weight noise doesn't dominate the visual.
 */
export function rolling7DayMean(
  logs: WeightLog[]
): Array<{ date: string; kg: number; trend: number | null }> {
  return logs.map((log, i) => {
    const windowStart = Math.max(0, i - 6);
    const slice = logs.slice(windowStart, i + 1);
    const avg =
      slice.reduce((sum, l) => sum + l.gewicht_kg, 0) / slice.length;
    return {
      date: log.gemessen_am,
      kg: log.gewicht_kg,
      trend: slice.length >= 3 ? Number(avg.toFixed(2)) : null,
    };
  });
}

/**
 * kg delta between first and last entry in the array. Returns 0 if < 2 entries.
 */
export function totalChange(logs: WeightLog[]): number {
  if (logs.length < 2) return 0;
  return logs[logs.length - 1].gewicht_kg - logs[0].gewicht_kg;
}

/**
 * Change over the last N days, relative to the closest log >= N days ago.
 * Null when there's no reference point that far back.
 */
export function changeOverDays(
  logs: WeightLog[],
  days: number,
  now: Date = new Date()
): number | null {
  if (logs.length < 2) return null;
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  // First log >= cutoff is the anchor. Last log is the current weight.
  const anchor =
    logs.find((l) => l.gemessen_am >= cutoffStr) ?? logs[0];
  const current = logs[logs.length - 1];
  if (!anchor || anchor.id === current.id) return null;
  return current.gewicht_kg - anchor.gewicht_kg;
}

/**
 * Average kg per week, computed from the span of available data.
 * Returns 0 when logs span less than 7 days.
 */
export function avgChangePerWeek(logs: WeightLog[]): number {
  if (logs.length < 2) return 0;
  const first = logs[0];
  const last = logs[logs.length - 1];
  const days =
    (new Date(last.gemessen_am).getTime() -
      new Date(first.gemessen_am).getTime()) /
    (1000 * 60 * 60 * 24);
  if (days < 7) return 0;
  const delta = last.gewicht_kg - first.gewicht_kg;
  return (delta / days) * 7;
}

/**
 * min/max values together with their dates.
 */
export function minMax(logs: WeightLog[]): {
  min: WeightLog | null;
  max: WeightLog | null;
} {
  if (logs.length === 0) return { min: null, max: null };
  let min = logs[0];
  let max = logs[0];
  for (const l of logs) {
    if (l.gewicht_kg < min.gewicht_kg) min = l;
    if (l.gewicht_kg > max.gewicht_kg) max = l;
  }
  return { min, max };
}

/**
 * Days since the most recent entry. Returns null if no entries.
 */
export function daysSinceLast(
  logs: WeightLog[],
  now: Date = new Date()
): number | null {
  if (logs.length === 0) return null;
  const last = logs[logs.length - 1];
  const diff =
    (now.getTime() - new Date(last.gemessen_am).getTime()) /
    (1000 * 60 * 60 * 24);
  return Math.max(0, Math.floor(diff));
}

/**
 * Goal projection. Uses the last 28 days as the trend window. Returns a
 * human-readable message plus expected date when plausible; returns a
 * gentle message when the trend doesn't match the goal direction.
 */
export type Projection = {
  message: string;
  expectedDate: string | null;
  kgPerWeek: number;
  /** Positive = gaining, negative = losing. */
  trendKgPerDay: number;
};

export function projectGoal(
  logs: WeightLog[],
  targetWeight: number,
  now: Date = new Date()
): Projection | null {
  if (logs.length < 2) return null;

  // Window: last 28 days of actual data
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 28);
  const cutoffStr = cutoff.toISOString().split("T")[0];
  const window = logs.filter((l) => l.gemessen_am >= cutoffStr);
  if (window.length < 2) return null;

  const first = window[0];
  const last = window[window.length - 1];
  const days =
    (new Date(last.gemessen_am).getTime() -
      new Date(first.gemessen_am).getTime()) /
    (1000 * 60 * 60 * 24);
  if (days < 3) return null; // zu kurzer Zeitraum → keine sinnvolle Prognose

  const kgPerDay = (last.gewicht_kg - first.gewicht_kg) / days;
  const remaining = targetWeight - last.gewicht_kg;
  const kgPerWeek = kgPerDay * 7;

  // Trend bewegt sich nicht oder in die falsche Richtung
  if (
    Math.abs(kgPerDay) < 0.001 ||
    (remaining !== 0 && Math.sign(kgPerDay) !== Math.sign(remaining))
  ) {
    return {
      message:
        "Aktuell bewegt sich dein Gewicht nicht in Richtung deines Ziels.",
      expectedDate: null,
      kgPerWeek,
      trendKgPerDay: kgPerDay,
    };
  }

  const daysToTarget = Math.round(remaining / kgPerDay);
  if (daysToTarget < 0 || daysToTarget > 365 * 3) {
    return {
      message: "Im aktuellen Tempo würde das Ziel sehr lange dauern.",
      expectedDate: null,
      kgPerWeek,
      trendKgPerDay: kgPerDay,
    };
  }

  const expected = new Date(now);
  expected.setDate(expected.getDate() + daysToTarget);
  const expectedStr = expected.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return {
    message: `Bei aktuellem Tempo erreichst du dein Ziel voraussichtlich am ${expectedStr}.`,
    expectedDate: expectedStr,
    kgPerWeek,
    trendKgPerDay: kgPerDay,
  };
}

/**
 * Progress percent toward goal. 0-100.
 * Uses the Ziel's startwert (original anchor from goal creation) if available,
 * else falls back to the first log.
 */
export function progressPercent(
  startWeight: number,
  currentWeight: number,
  targetWeight: number
): number {
  const total = Math.abs(targetWeight - startWeight);
  if (total === 0) return 100;
  const done = Math.abs(currentWeight - startWeight);
  return Math.min(100, Math.max(0, Math.round((done / total) * 100)));
}

/** Format an ISO date (YYYY-MM-DD) to dd.mm.yy */
export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

/** Format an ISO date (YYYY-MM-DD) to dd. Monat */
export function formatDateLong(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
