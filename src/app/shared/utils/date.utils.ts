/**
 * Client-side date helpers. Same conventions as the API (design §0):
 * dates are `YYYY-MM-DD`, months are `YYYY-MM`, both in the user's LOCAL calendar.
 * (Never use `toISOString()` for a calendar date — it converts to UTC and can shift the day in IST.)
 */

const pad = (n: number) => String(n).padStart(2, '0');

/** Local Date → `YYYY-MM-DD`. */
export function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** `YYYY-MM-DD` → local Date at midnight (for the datepicker). */
export function fromIsoDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** Today as `YYYY-MM-DD`. */
export function todayIso(): string {
  return toIsoDate(new Date());
}

/** addDaysIso('2026-11-01', -1) → '2026-10-31'. */
export function addDaysIso(value: string, days: number): string {
  const d = fromIsoDate(value);
  d.setDate(d.getDate() + days);
  return toIsoDate(d);
}

/**
 * Whole days from today (local calendar) to `value`: 0 = today, 1 = tomorrow, -3 = three days ago (R14 AC2).
 * Both dates are local midnights, so rounding absorbs the 23/25-hour days of DST countries.
 */
export function daysUntil(value: string, today = todayIso()): number {
  return Math.round((fromIsoDate(value).getTime() - fromIsoDate(today).getTime()) / 86_400_000);
}

/** Current month as `YYYY-MM`. */
export function currentMonth(): string {
  return todayIso().slice(0, 7);
}

/** addMonths('2026-01', -1) → '2025-12'. */
export function addMonths(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/** `YYYY-MM` → Date on the 1st of that month (for formatting, e.g. 'MMM y' → "Nov 2026"). */
export function monthToDate(month: string): Date {
  const [y, m] = month.split('-').map(Number);
  return new Date(y, m - 1, 1);
}
