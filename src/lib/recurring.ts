import { z } from "zod";
import { addDays, dateKeyToDate, isDateKey, type DateKey } from "@/lib/date";
import { categoriesFor } from "@/lib/finance";

export const FREQUENCIES = ["weekly", "monthly", "yearly"] as const;
export type Frequency = (typeof FREQUENCIES)[number];

// Messages are translation keys under Finance.errors.
export const recurringSchema = z
  .object({
    type: z.enum(["income", "expense"]),
    amount: z
      .number({ required_error: "required", invalid_type_error: "required" })
      .positive("positive")
      .max(1_000_000_000_000, "tooLarge"),
    category: z.string().min(1, "required"),
    description: z.string().trim().max(200, "tooLong").optional(),
    frequency: z.enum(FREQUENCIES),
    startDate: z.string().refine(isDateKey, "invalidDate"),
  })
  .refine((v) => categoriesFor(v.type).includes(v.category), {
    message: "invalidCategory",
    path: ["category"],
  });
export type RecurringInput = z.infer<typeof recurringSchema>;

function ymd(key: DateKey) {
  const d = dateKeyToDate(key);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() };
}

/** Day `day` of month (y, m), clamped to the month's length (31 → 30/28/29). */
function clampedDate(y: number, m: number, day: number): DateKey {
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(day, last))).toISOString().slice(0, 10);
}

/**
 * The occurrence after `current`. Monthly/yearly keep the anchor's day of month,
 * so a rule anchored on the 31st lands on 30 Apr, 28 Feb, then back on 31 May.
 */
export function nextOccurrence(anchor: DateKey, current: DateKey, frequency: Frequency): DateKey {
  if (frequency === "weekly") return addDays(current, 7);
  const a = ymd(anchor);
  const c = ymd(current);
  if (frequency === "monthly") {
    const monthIndex = c.m + 1;
    return clampedDate(c.y + Math.floor(monthIndex / 12), monthIndex % 12, a.d);
  }
  return clampedDate(c.y + 1, a.m, a.d);
}

/** Occurrences from `nextDate` up to and including `today`, and the new next date. */
export function dueOccurrences(anchor: DateKey, nextDate: DateKey, frequency: Frequency, today: DateKey, limit = 500) {
  const dates: DateKey[] = [];
  let cursor = nextDate;
  while (cursor <= today && dates.length < limit) {
    dates.push(cursor);
    cursor = nextOccurrence(anchor, cursor, frequency);
  }
  return { dates, nextDate: cursor };
}

/** Editable fields; applies to occurrences generated from now on. */
export const recurringPatchSchema = z.object({
  isActive: z.boolean().optional(),
  amount: z
    .number({ invalid_type_error: "required" })
    .positive("positive")
    .max(1_000_000_000_000, "tooLarge")
    .optional(),
  category: z.string().min(1).optional(),
  description: z.string().trim().max(200, "tooLong").nullish(),
});
