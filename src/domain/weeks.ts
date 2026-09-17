import type { WeekStart } from './types';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

/** Parses an ISO date as local midnight, avoiding the UTC shift `new Date(s)` applies. */
export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  if (y === undefined || m === undefined || d === undefined) {
    throw new Error(`Not an ISO date: ${iso}`);
  }
  return new Date(y, m - 1, d);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** The Monday on or before `date`. Weeks are Monday-start throughout. */
export function weekStartOf(date: Date): WeekStart {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - dow);
  return toISODate(d);
}

export function addWeeks(weekStart: WeekStart, n: number): WeekStart {
  return toISODate(new Date(parseDate(weekStart).getTime() + n * WEEK_MS));
}

/** `count` consecutive week starts beginning at the Monday of `from`. */
export function weekRange(from: Date, count: number): WeekStart[] {
  const first = weekStartOf(from);
  return Array.from({ length: count }, (_, i) => addWeeks(first, i));
}

export function weeksBetween(a: WeekStart, b: WeekStart): number {
  return Math.round((parseDate(b).getTime() - parseDate(a).getTime()) / WEEK_MS);
}

/** Short display label, e.g. "Sep 14". */
export function formatWeek(weekStart: WeekStart): string {
  return parseDate(weekStart).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function daysBetween(from: Date, to: Date): number {
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b.getTime() - a.getTime()) / DAY_MS);
}
