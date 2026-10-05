import { z } from "zod";
import { isDateKey, type DateKey, dateToKey } from "@/lib/date";

export const WORKOUT_TYPES = ["strength", "cardio", "flexibility", "sports", "other"] as const;
export type WorkoutType = (typeof WORKOUT_TYPES)[number];

export const workoutSchema = z.object({
  name: z.string().trim().min(1, "required").max(100, "tooLong"),
  type: z.enum(WORKOUT_TYPES),
  duration: z.number().int().min(1, "positive").max(300, "tooLarge").nullish(),
  notes: z.string().trim().max(1000, "tooLong").nullish(),
  date: z.string().refine(isDateKey, "invalidDate"),
});

export type WorkoutInput = z.infer<typeof workoutSchema>;

export const workoutPatchSchema = workoutSchema.partial();

export type WorkoutDTO = {
  id: string;
  name: string;
  type: WorkoutType;
  duration: number | null;
  notes: string | null;
  date: DateKey;
};

export function serializeWorkout(log: {
  id: string;
  name: string;
  type: string;
  duration: number | null;
  notes: string | null;
  date: Date;
}): WorkoutDTO {
  return {
    id: log.id,
    name: log.name,
    type: log.type as WorkoutType,
    duration: log.duration,
    notes: log.notes,
    date: dateToKey(log.date),
  };
}
