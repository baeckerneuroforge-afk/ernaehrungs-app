/**
 * Calendar date helpers for a DE-facing product. Server defaults to Europe/Berlin
 * so "today" matches users in CET/CEST instead of UTC midnight skew.
 */

const DEFAULT_TZ = "Europe/Berlin";

/**
 * Return YYYY-MM-DD for `date` in the given IANA timezone (default Europe/Berlin).
 */
export function calendarDateInTimeZone(
  date: Date = new Date(),
  timeZone: string = DEFAULT_TZ
): string {
  // en-CA yields ISO-like YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Today's calendar date in Europe/Berlin (YYYY-MM-DD). */
export function todayLocal(timeZone: string = DEFAULT_TZ): string {
  return calendarDateInTimeZone(new Date(), timeZone);
}

/**
 * Whole calendar-day difference between two YYYY-MM-DD strings (dateB - dateA).
 * Uses UTC noon anchors so DST does not shift the day count.
 */
export function calendarDaysBetween(startIso: string, todayIso: string): number {
  const start = Date.parse(`${startIso}T12:00:00.000Z`);
  const today = Date.parse(`${todayIso}T12:00:00.000Z`);
  if (Number.isNaN(start) || Number.isNaN(today)) return 0;
  return Math.floor((today - start) / 86_400_000);
}

/** YYYY-MM-DD of an ISO timestamp in Europe/Berlin (or given TZ). */
export function isoToCalendarDate(
  iso: string,
  timeZone: string = DEFAULT_TZ
): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return todayLocal(timeZone);
  return calendarDateInTimeZone(d, timeZone);
}
