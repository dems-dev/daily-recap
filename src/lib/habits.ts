import { z } from "zod";
import { addDays, isDateKey, type DateKey } from "@/lib/date";

// Messages are translation keys under Common.errors.
export const habitSchema = z.object({
  name: z.string().trim().min(1, "required").max(60, "tooLong"),
  icon: z.string().trim().max(8, "tooLong").nullish(),
});
export type HabitInput = z.infer<typeof habitSchema>;

export const habitPatchSchema = habitSchema.partial().extend({ isActive: z.boolean().optional() });

export const habitLogSchema = z.object({
  date: z.string().refine(isDateKey, "invalidDate"),
  completed: z.boolean(),
});

/**
 * Consecutive completed days ending today. A habit not yet done today
 * doesn't break the streak - it counts back from yesterday instead.
 */
export function currentStreak(done: ReadonlySet<DateKey>, today: DateKey) {
  let day = done.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (done.has(day)) {
    streak += 1;
    day = addDays(day, -1);
  }
  return streak;
}

export function bestStreak(done: ReadonlySet<DateKey>) {
  let best = 0;
  for (const day of done) {
    if (done.has(addDays(day, -1))) continue; // not the start of a run
    let length = 1;
    let next = addDays(day, 1);
    while (done.has(next)) {
      length += 1;
      next = addDays(next, 1);
    }
    best = Math.max(best, length);
  }
  return best;
}

/**
 * Share of days completed over the last `window` days (including today),
 * counting only days since the habit was created.
 */
export function completionRate(done: ReadonlySet<DateKey>, today: DateKey, createdOn: DateKey, window = 30) {
  const windowStart = addDays(today, -(window - 1));
  const start = createdOn > windowStart ? createdOn : windowStart;
  let eligible = 0;
  let hits = 0;
  for (let day = start; day <= today; day = addDays(day, 1)) {
    eligible += 1;
    if (done.has(day)) hits += 1;
  }
  return eligible === 0 ? 0 : hits / eligible;
}
