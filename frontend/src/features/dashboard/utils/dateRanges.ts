/**
 * Utility functions for computing dashboard date ranges in CLINIC_TZ (America/La_Paz).
 *
 * These are pure functions — no side effects — so they're easy to unit-test.
 */

import { todayInClinic, weekday, addDays, formatDayShort } from '@/features/availability/dates';

export interface DateRange {
  from: string;
  to: string;
}

export type RangePreset = 'week' | 'month' | 'custom';

/** Monday–Friday of the current week. */
export function currentWeekRange(now: Date = new Date()): DateRange {
  const today = todayInClinic(now);
  const wd = weekday(today);
  const isoWd = wd === 0 ? 7 : wd;
  const monday = addDays(today, 1 - isoWd);
  const friday = addDays(monday, 4);
  return { from: monday, to: friday };
}

/** First and last day of the current calendar month. */
export function currentMonthRange(now: Date = new Date()): DateRange {
  const today = todayInClinic(now);
  const [y, m] = today.split('-').map(Number);
  const from = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const to = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { from, to };
}

/**
 * Format a range as a human-readable string.
 * Example: "Lun 28 sep – Vie 2 oct 2026"
 */
export function formatRange(range: DateRange): string {
  return `${formatDayShort(range.from).slice(0, -5)} – ${formatDayShort(range.to)}`;
}

/** Compute peak hour from byHour array. Returns the entry with the highest active count. */
export function findPeakHour(byHour: { hour: string; active: number }[]): { hour: string; active: number } | null {
  if (byHour.length === 0) return null;
  return byHour.reduce((peak, h) => (h.active > peak.active ? h : peak), byHour[0]);
}
