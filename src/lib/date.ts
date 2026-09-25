/**
 * Date conventions for this app:
 *
 * - A "calendar date" (transaction date, log date, due date, ...) is stored as
 *   UTC midnight of that date, e.g. 25 Sep 2026 -> 2026-09-25T00:00:00.000Z.
 *   It carries no time and no timezone, so it compares exactly with `equals`.
 * - Which calendar date is "today" depends on the user's timezone
 *   (`User.timezone`), never on the server's timezone.
 * - Across the wire, calendar dates travel as "YYYY-MM-DD" keys.
 * - Real moments (createdAt, completedAt) stay as normal instants.
 */

export const DEFAULT_TIMEZONE = "Asia/Jakarta";

const DATE_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTH_KEY_RE = /^(\d{4})-(0[1-9]|1[0-2])$/;

export type DateKey = string; // "YYYY-MM-DD"
export type MonthKey = string; // "YYYY-MM"

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function isValidTimezone(timeZone: string | null | undefined): timeZone is string {
  if (!timeZone) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

export function resolveTimezone(timeZone: string | null | undefined) {
  return isValidTimezone(timeZone) ? timeZone : DEFAULT_TIMEZONE;
}

/** Wall-clock parts of an instant as seen in `timeZone`. */
function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** Offset of `timeZone` from UTC at `date`, in milliseconds (Jakarta = +7h). */
function timezoneOffsetMs(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/** The calendar date of `date` in `timeZone`, as "YYYY-MM-DD". */
export function dateKeyInTz(date: Date, timeZone: string): DateKey {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

export function todayKey(timeZone: string): DateKey {
  return dateKeyInTz(new Date(), timeZone);
}

export function isDateKey(value: string): value is DateKey {
  const m = DATE_KEY_RE.exec(value);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

export function isMonthKey(value: string): value is MonthKey {
  return MONTH_KEY_RE.test(value);
}

/** "YYYY-MM-DD" -> the stored calendar-date value (UTC midnight). */
export function dateKeyToDate(key: DateKey): Date {
  if (!isDateKey(key)) throw new Error(`Invalid date key: ${key}`);
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Stored calendar-date value -> "YYYY-MM-DD". */
export function dateToKey(date: Date): DateKey {
  return date.toISOString().slice(0, 10);
}

/** Stored calendar-date value for "today" in `timeZone`. */
export function todayDate(timeZone: string): Date {
  return dateKeyToDate(todayKey(timeZone));
}

/**
 * The real instants [start, end) that make up calendar day `key` in `timeZone`.
 * Use this to filter instants (createdAt, completedAt) by "that day".
 */
export function dayBoundsInTz(key: DateKey, timeZone: string) {
  const midnightUtc = dateKeyToDate(key).getTime();
  const nextMidnightUtc = midnightUtc + 24 * 60 * 60 * 1000;
  return {
    start: new Date(midnightUtc - timezoneOffsetMs(new Date(midnightUtc), timeZone)),
    end: new Date(nextMidnightUtc - timezoneOffsetMs(new Date(nextMidnightUtc), timeZone)),
  };
}

export function monthKeyOf(key: DateKey): MonthKey {
  return key.slice(0, 7);
}

export function parseMonthKey(key: MonthKey) {
  if (!isMonthKey(key)) throw new Error(`Invalid month key: ${key}`);
  const [year, month] = key.split("-").map(Number);
  return { year, month };
}

export function toMonthKey(year: number, month: number): MonthKey {
  return `${year}-${pad(month)}`;
}

export function shiftMonth(key: MonthKey, delta: number): MonthKey {
  const { year, month } = parseMonthKey(key);
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return toMonthKey(d.getUTCFullYear(), d.getUTCMonth() + 1);
}

export function daysInMonth(key: MonthKey) {
  const { year, month } = parseMonthKey(key);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Calendar-date range [start, end) covering the whole month. */
export function monthRange(key: MonthKey) {
  const { year, month } = parseMonthKey(key);
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 1)),
  };
}

/** All "YYYY-MM-DD" keys in a month, in order. */
export function monthDateKeys(key: MonthKey): DateKey[] {
  return Array.from({ length: daysInMonth(key) }, (_, i) => `${key}-${pad(i + 1)}`);
}

/**
 * "YYYY-MM-DD" -> a local Date at midnight, for display with date-fns.
 * Never use this value for storage.
 */
export function dateKeyToLocalDate(key: DateKey): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}
