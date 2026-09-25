import { z } from "zod";
import { isDateKey } from "@/lib/date";

/** Three is the recommended number; five is the hard cap so the list stays a priority list. */
export const RECOMMENDED_PRIORITIES = 3;
export const MAX_PRIORITIES = 5;

// Messages are translation keys under Plans.errors / Common.errors.
export const priorityCreateSchema = z.object({
  /** Any day inside the week. */
  date: z.string().refine(isDateKey, "invalidDate"),
  title: z.string().trim().min(1, "required").max(120, "tooLong"),
});

export const priorityPatchSchema = z.object({
  title: z.string().trim().min(1, "required").max(120, "tooLong").optional(),
  isDone: z.boolean().optional(),
});
