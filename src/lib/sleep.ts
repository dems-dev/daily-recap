import { z } from "zod";
import { addDays, dateKeyToDate, isDateKey, type DateKey } from "@/lib/date";

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
export type LocalTime = string; // "HH:MM"

export function isLocalTime(value: string): value is LocalTime {
  return TIME_RE.test(value);
}

const minutesOf = (t: LocalTime) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

// Messages are translation keys under Sleep.errors / Common.errors.
export const sleepSchema = z.object({
  date: z.string().refine(isDateKey, "invalidDate"),
  bedtime: z.string().refine(isLocalTime, "invalidTime"),
  wakeTime: z.string().refine(isLocalTime, "invalidTime"),
  quality: z.number().int().min(1, "required").max(5),
  notes: z.string().trim().max(500, "tooLong").nullish(),
});
export type SleepInput = z.infer<typeof sleepSchema>;

function offsetMs(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"));
  return asUtc - Math.floor(instant.getTime() / 60_000) * 60_000;
}

/** The instant when the wall clock in `timeZone` shows `time` on `date`. */
export function localTimeToInstant(date: DateKey, time: LocalTime, timeZone: string): Date {
  const wall = dateKeyToDate(date).getTime() + minutesOf(time) * 60_000;
  // Two passes settle the offset across DST changes.
  let guess = wall - offsetMs(new Date(wall), timeZone);
  guess = wall - offsetMs(new Date(guess), timeZone);
  return new Date(guess);
}

/** "HH:MM" of an instant in `timeZone`. */
export function instantToLocalTime(instant: Date, timeZone: string): LocalTime {
  return new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(
    instant
  );
}

/**
 * Bed and wake instants for the night that ended on the morning of `wakeDate`.
 * A bedtime later on the clock than the wake time (23:30 → 06:15) means the evening before;
 * an earlier one (01:00 → 07:00) means the same day.
 */
export function sleepWindow(wakeDate: DateKey, bedtime: LocalTime, wakeTime: LocalTime, timeZone: string) {
  const bedDate = minutesOf(bedtime) >= minutesOf(wakeTime) ? addDays(wakeDate, -1) : wakeDate;
  const bed = localTimeToInstant(bedDate, bedtime, timeZone);
  const wake = localTimeToInstant(wakeDate, wakeTime, timeZone);
  return { bedtime: bed, wakeTime: wake, duration: Math.round((wake.getTime() - bed.getTime()) / 60_000) };
}

export const MIN_SLEEP_MINUTES = 30;
export const MAX_SLEEP_MINUTES = 16 * 60;

/**
 * Bedtime spread in minutes (standard deviation). Clock times are measured from
 * 18:00 so that 23:30 and 00:30 are one hour apart, not 23.
 */
export function bedtimeSpread(bedtimes: LocalTime[]) {
  if (bedtimes.length < 2) return null;
  const xs = bedtimes.map((t) => (minutesOf(t) - 18 * 60 + 24 * 60) % (24 * 60));
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  const variance = xs.reduce((a, x) => a + (x - mean) ** 2, 0) / xs.length;
  return Math.round(Math.sqrt(variance));
}

/** Average of clock times measured from 18:00, back as "HH:MM". */
export function averageBedtime(bedtimes: LocalTime[]): LocalTime | null {
  if (bedtimes.length === 0) return null;
  const xs = bedtimes.map((t) => (minutesOf(t) - 18 * 60 + 24 * 60) % (24 * 60));
  const mean = Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
  const minutes = (mean + 18 * 60) % (24 * 60);
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** "7j 30m" / "7h 30m" */
export function formatDuration(minutes: number, locale: string) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const hu = locale === "id" ? "j" : "h";
  return m ? `${h}${hu} ${m}m` : `${h}${hu}`;
}
