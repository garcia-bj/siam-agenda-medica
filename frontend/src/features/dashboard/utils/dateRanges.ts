/**
 * Utility functions for computing dashboard date ranges in CLINIC_TZ (America/La_Paz).
 *
 * These are pure functions — no side effects — so they're easy to unit-test.
 */

const CLINIC_TZ = 'America/La_Paz';

/** Today as YYYY-MM-DD in the clinic timezone. */
export function todayClinic(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: CLINIC_TZ });
}

/** ISO weekday: 1 = Monday … 7 = Sunday */
function isoWeekday(dateStr: string): number {
  const d = new Date(`${dateStr}T12:00:00`);
  return d.getDay() === 0 ? 7 : d.getDay();
}

/** Add `n` days to a YYYY-MM-DD string. */
function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export interface DateRange {
  from: string;
  to: string;
}

export type RangePreset = 'week' | 'month' | 'custom';

/** Monday–Friday of the current week. */
export function currentWeekRange(): DateRange {
  const today = todayClinic();
  const wd = isoWeekday(today);
  const monday = addDays(today, 1 - wd);
  const friday = addDays(monday, 4);
  return { from: monday, to: friday };
}

/** First and last day of the current calendar month. */
export function currentMonthRange(): DateRange {
  const today = todayClinic();
  const [y, m] = today.split('-').map(Number);
  const from = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const to = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

/**
 * Format a range as a human-readable string.
 * Example: "Lun 28 sep – Vie 2 oct 2026"
 */
export function formatRange(range: DateRange): string {
  const shortDay = (ds: string) => {
    const d = new Date(`${ds}T12:00:00`);
    const day = d.toLocaleDateString('es', { weekday: 'short', timeZone: 'UTC' });
    return day.charAt(0).toUpperCase() + day.slice(1).replace('.', '');
  };

  const monthName = (ds: string) =>
    new Date(`${ds}T12:00:00`).toLocaleDateString('es', { month: 'short', timeZone: 'UTC' }).replace('.', '');

  const fromD = new Date(`${range.from}T12:00:00`);
  const toD = new Date(`${range.to}T12:00:00`);
  const fromMonth = monthName(range.from);
  const toMonth = monthName(range.to);
  const toYear = toD.getFullYear();

  if (fromMonth === toMonth) {
    return `${shortDay(range.from)} ${fromD.getUTCDate()} ${fromMonth} – ${shortDay(range.to)} ${toD.getUTCDate()} ${toMonth} ${toYear}`;
  }
  return `${shortDay(range.from)} ${fromD.getUTCDate()} ${fromMonth} – ${shortDay(range.to)} ${toD.getUTCDate()} ${toMonth} ${toYear}`;
}

/** Compute peak hour from byHour array. Returns the entry with the highest active count. */
export function findPeakHour(byHour: { hour: string; active: number }[]): { hour: string; active: number } | null {
  if (byHour.length === 0) return null;
  return byHour.reduce((peak, h) => (h.active > peak.active ? h : peak), byHour[0]);
}
