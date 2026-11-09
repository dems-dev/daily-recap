import { z } from "zod";
import { isDateKey, type DateKey, dateToKey } from "@/lib/date";
import { exerciseInputSchema, type ExerciseSetInput, type RecordHit } from "@/lib/exercises";

export const WORKOUT_TYPES = ["strength", "cardio", "flexibility", "sports", "other"] as const;
export type WorkoutType = (typeof WORKOUT_TYPES)[number];

export const workoutSchema = z.object({
  name: z.string().trim().min(1, "required").max(100, "tooLong"),
  type: z.enum(WORKOUT_TYPES),
  duration: z.number().int().min(1, "positive").max(300, "tooLarge").nullish(),
  notes: z.string().trim().max(1000, "tooLong").nullish(),
  date: z.string().refine(isDateKey, "invalidDate"),
  /** Left out entirely by callers that only log a session, not its exercises. */
  exercises: z.array(exerciseInputSchema).max(30, "tooLarge").optional(),
});

export type WorkoutInput = z.infer<typeof workoutSchema>;

export const workoutPatchSchema = workoutSchema.partial();

export type ExerciseDTO = {
  id: string;
  name: string;
  canonicalName: string;
  sets: ExerciseSetInput[];
  bestWeight: number | null;
  bestWeightReps: number | null;
  bestOneRm: number | null;
  bestReps: number | null;
};

export type WorkoutDTO = {
  id: string;
  name: string;
  type: WorkoutType;
  duration: number | null;
  notes: string | null;
  date: DateKey;
  exercises: ExerciseDTO[];
};

/** What a save reports back, so the UI can show "Rekor baru!" on the session. */
export type WorkoutSaveResult = WorkoutDTO & {
  newRecords: Array<RecordHit & { name: string; canonicalName: string }>;
};

/** `sets` is stored as JSON, so it is validated again on the way out. */
function parseSets(value: unknown): ExerciseSetInput[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const { reps, weight } = entry as { reps?: unknown; weight?: unknown };
    if (typeof reps !== "number" || !Number.isFinite(reps)) return [];
    return [{ reps, weight: typeof weight === "number" && Number.isFinite(weight) ? weight : null }];
  });
}

export function serializeExercise(row: {
  id: string;
  name: string;
  canonicalName: string | null;
  sets: unknown;
  bestWeight: number | null;
  bestWeightReps: number | null;
  bestOneRm: number | null;
  bestReps: number | null;
}): ExerciseDTO {
  return {
    id: row.id,
    name: row.name,
    canonicalName: row.canonicalName ?? "",
    sets: parseSets(row.sets),
    bestWeight: row.bestWeight,
    bestWeightReps: row.bestWeightReps,
    bestOneRm: row.bestOneRm,
    bestReps: row.bestReps,
  };
}

export function serializeWorkout(log: {
  id: string;
  name: string;
  type: string;
  duration: number | null;
  notes: string | null;
  date: Date;
  exercises?: Parameters<typeof serializeExercise>[0][];
}): WorkoutDTO {
  return {
    id: log.id,
    name: log.name,
    type: log.type as WorkoutType,
    duration: log.duration,
    notes: log.notes,
    date: dateToKey(log.date),
    exercises: (log.exercises ?? []).map(serializeExercise),
  };
}
