import { z } from "zod";
import type { DateKey } from "@/lib/date";

/**
 * Epley only stays close to reality for low-rep sets; past this many reps it
 * overshoots badly, so those sets count towards the reps record instead of 1RM.
 */
export const ONE_RM_MAX_REPS = 12;

/** Smallest gap that counts as beating a record - weights are floats. */
const RECORD_EPSILON = 0.001;

export type ExerciseGroup = "barbell" | "dumbbell" | "machine" | "bodyweight";

export type ExercisePreset = {
  /** Stored as `Exercise.canonicalName`, and the i18n key under `Workout.exercisePresets`. */
  id: string;
  group: ExerciseGroup;
  /** Logged without external weight, so its record is "most reps in one set". */
  bodyweight: boolean;
};

/** The picker list. Stable ids are what keep records from splitting. */
export const EXERCISE_PRESETS: readonly ExercisePreset[] = [
  { id: "bench-press", group: "barbell", bodyweight: false },
  { id: "incline-bench-press", group: "barbell", bodyweight: false },
  { id: "overhead-press", group: "barbell", bodyweight: false },
  { id: "squat", group: "barbell", bodyweight: false },
  { id: "front-squat", group: "barbell", bodyweight: false },
  { id: "deadlift", group: "barbell", bodyweight: false },
  { id: "romanian-deadlift", group: "barbell", bodyweight: false },
  { id: "barbell-row", group: "barbell", bodyweight: false },
  { id: "hip-thrust", group: "barbell", bodyweight: false },
  { id: "dumbbell-bench-press", group: "dumbbell", bodyweight: false },
  { id: "dumbbell-shoulder-press", group: "dumbbell", bodyweight: false },
  { id: "dumbbell-row", group: "dumbbell", bodyweight: false },
  { id: "biceps-curl", group: "dumbbell", bodyweight: false },
  { id: "triceps-extension", group: "dumbbell", bodyweight: false },
  { id: "lateral-raise", group: "dumbbell", bodyweight: false },
  { id: "goblet-squat", group: "dumbbell", bodyweight: false },
  { id: "lat-pulldown", group: "machine", bodyweight: false },
  { id: "seated-row", group: "machine", bodyweight: false },
  { id: "chest-press", group: "machine", bodyweight: false },
  { id: "leg-press", group: "machine", bodyweight: false },
  { id: "leg-curl", group: "machine", bodyweight: false },
  { id: "push-up", group: "bodyweight", bodyweight: true },
  { id: "pull-up", group: "bodyweight", bodyweight: true },
  { id: "chin-up", group: "bodyweight", bodyweight: true },
  { id: "dip", group: "bodyweight", bodyweight: true },
  { id: "sit-up", group: "bodyweight", bodyweight: true },
  { id: "crunch", group: "bodyweight", bodyweight: true },
  { id: "plank", group: "bodyweight", bodyweight: true },
  { id: "lunge", group: "bodyweight", bodyweight: true },
  { id: "burpee", group: "bodyweight", bodyweight: true },
];

const PRESETS_BY_ID = new Map(EXERCISE_PRESETS.map((preset) => [preset.id, preset]));

/**
 * Free text that should land on the same record as a preset. Keys are already
 * slugified, so "Push Ups", "push-up" and "PUSHUPS" all arrive as one lookup.
 */
const ALIASES: Readonly<Record<string, string>> = {
  pushup: "push-up",
  pushups: "push-up",
  "push-ups": "push-up",
  pullup: "pull-up",
  pullups: "pull-up",
  "pull-ups": "pull-up",
  chinup: "chin-up",
  chinups: "chin-up",
  "chin-ups": "chin-up",
  situp: "sit-up",
  situps: "sit-up",
  "sit-ups": "sit-up",
  crunches: "crunch",
  planks: "plank",
  lunges: "lunge",
  burpees: "burpee",
  dips: "dip",
  "tricep-dip": "dip",
  bench: "bench-press",
  "bench-presses": "bench-press",
  bp: "bench-press",
  "incline-bench": "incline-bench-press",
  ohp: "overhead-press",
  "shoulder-press": "overhead-press",
  "military-press": "overhead-press",
  squats: "squat",
  "back-squat": "squat",
  deadlifts: "deadlift",
  dl: "deadlift",
  rdl: "romanian-deadlift",
  "bent-over-row": "barbell-row",
  "barbell-rows": "barbell-row",
  pulldown: "lat-pulldown",
  "lat-pull-down": "lat-pulldown",
  "cable-row": "seated-row",
  "bicep-curl": "biceps-curl",
  "bicep-curls": "biceps-curl",
  "biceps-curls": "biceps-curl",
  curl: "biceps-curl",
  "tricep-extension": "triceps-extension",
  "triceps-extensions": "triceps-extension",
  "lateral-raises": "lateral-raise",
  "side-raise": "lateral-raise",
  legpress: "leg-press",
  "leg-presses": "leg-press",
};

function slugify(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * The key records are grouped by, so "Bench Press", "bench  press" and
 * "Bench-Press" stay one record instead of three.
 */
export function normalizeExerciseName(raw: string): string {
  const slug = slugify(raw ?? "");
  if (!slug) return "";
  if (PRESETS_BY_ID.has(slug)) return slug;
  return ALIASES[slug] ?? slug;
}

export function presetById(canonicalName: string): ExercisePreset | undefined {
  return PRESETS_BY_ID.get(canonicalName);
}

export type ExerciseSetInput = { reps: number; weight?: number | null };

export const exerciseSetSchema = z.object({
  reps: z.number().int().min(1, "positive").max(500, "tooLarge"),
  weight: z.number().min(0, "positive").max(1000, "tooLarge").nullish(),
});

export const exerciseInputSchema = z.object({
  name: z.string().trim().min(1, "required").max(80, "tooLong"),
  sets: z.array(exerciseSetSchema).min(1, "required").max(30, "tooLarge"),
});

export type ExerciseInput = z.infer<typeof exerciseInputSchema>;

/** Per-session summary, stored as columns so records stay an aggregate query. */
export type ExerciseBests = {
  bestWeight: number | null;
  bestWeightReps: number | null;
  bestOneRm: number | null;
  bestReps: number | null;
};

export const EMPTY_BESTS: ExerciseBests = {
  bestWeight: null,
  bestWeightReps: null,
  bestOneRm: null,
  bestReps: null,
};

const round1 = (value: number) => Math.round(value * 10) / 10;

/** Epley: `1RM = weight x (1 + reps / 30)`, and null above `ONE_RM_MAX_REPS`. */
export function epley1Rm(weight: number, reps: number): number | null {
  if (!Number.isFinite(weight) || weight <= 0) return null;
  if (!Number.isFinite(reps) || reps < 1 || reps > ONE_RM_MAX_REPS) return null;
  return round1(reps === 1 ? weight : weight * (1 + reps / 30));
}

const isWeighted = (set: ExerciseSetInput) =>
  set.weight !== null && set.weight !== undefined && Number.isFinite(set.weight) && set.weight > 0;

/**
 * Summarises one exercise in one session. A set counts as weighted when it
 * carries a weight above zero; an exercise with no weighted set at all is
 * measured in reps instead (push-ups, pull-ups).
 */
export function computeExerciseBests(
  sets: readonly ExerciseSetInput[] | null | undefined
): ExerciseBests {
  const valid = (sets ?? []).filter(
    (set): set is ExerciseSetInput => !!set && Number.isFinite(set.reps) && set.reps >= 1
  );
  if (!valid.length) return { ...EMPTY_BESTS };

  const bestReps = Math.max(...valid.map((set) => Math.trunc(set.reps)));
  const weighted = valid.filter(isWeighted);
  if (!weighted.length) return { ...EMPTY_BESTS, bestReps };

  const bestWeight = Math.max(...weighted.map((set) => set.weight as number));
  const bestWeightReps = Math.max(
    ...weighted.filter((set) => set.weight === bestWeight).map((set) => Math.trunc(set.reps))
  );
  // The best estimate can come from a lighter set with more reps, so take the max.
  const oneRms = weighted
    .map((set) => epley1Rm(set.weight as number, Math.trunc(set.reps)))
    .filter((value): value is number => value !== null);

  return {
    bestWeight,
    bestWeightReps,
    bestOneRm: oneRms.length ? Math.max(...oneRms) : null,
    bestReps,
  };
}

/** A set as stored in `Exercise.sets`: no undefined, so the JSON stays stable. */
export type NormalizedSet = { reps: number; weight: number | null };

/** One `Exercise` row, ready to be written. */
export type PreparedExercise = ExerciseBests & {
  userId: string;
  name: string;
  canonicalName: string;
  sets: NormalizedSet[];
  order: number;
};

/** Input to rows: normalises the name, the sets, and the per-session summary. */
export function prepareExercises(
  userId: string,
  inputs: readonly ExerciseInput[]
): PreparedExercise[] {
  return inputs.map((input, index) => {
    const sets: NormalizedSet[] = input.sets.map((set) => ({
      reps: Math.trunc(set.reps),
      weight: set.weight === null || set.weight === undefined ? null : set.weight,
    }));
    return {
      userId,
      name: input.name.trim(),
      canonicalName: normalizeExerciseName(input.name),
      sets,
      order: index,
      ...computeExerciseBests(sets),
    };
  });
}

/**
 * Collapses a session that lists the same exercise twice (say two bench press
 * blocks) so records are judged on the whole session, not one block.
 */
export function bestsByExercise(
  prepared: readonly PreparedExercise[]
): Map<string, { name: string; bests: ExerciseBests }> {
  const setsByName = new Map<string, { name: string; sets: NormalizedSet[] }>();
  for (const exercise of prepared) {
    if (!exercise.canonicalName) continue;
    const entry = setsByName.get(exercise.canonicalName);
    if (entry) entry.sets.push(...exercise.sets);
    else setsByName.set(exercise.canonicalName, { name: exercise.name, sets: [...exercise.sets] });
  }

  const bests = new Map<string, { name: string; bests: ExerciseBests }>();
  for (const [canonicalName, entry] of setsByName) {
    bests.set(canonicalName, { name: entry.name, bests: computeExerciseBests(entry.sets) });
  }
  return bests;
}

export type RecordKind = "weight" | "oneRm" | "reps";

export type RecordHit = {
  kind: RecordKind;
  value: number;
  /** null when this is the first time the exercise was logged. */
  previous: number | null;
};

const beats = (now: number | null, before: number | null) =>
  now !== null && (before === null || now > before + RECORD_EPSILON);

/**
 * The personal record for one exercise. Lives here, away from the queries, so
 * client components can use the type without pulling the database client in.
 */
export type ExerciseRecord = {
  canonicalName: string;
  /** Display name as the user last wrote it. */
  name: string;
  /** No weighted set has ever been logged, so the record is measured in reps. */
  bodyweight: boolean;
  bestWeight: number | null;
  bestOneRm: number | null;
  bestReps: number | null;
  sessions: number;
  lastDate: DateKey;
  lastWeight: number | null;
  lastWeightReps: number | null;
  lastReps: number | null;
};

/** One session on the progress chart. */
export type HistoryPoint = {
  date: DateKey;
  weight: number | null;
  oneRm: number | null;
  reps: number | null;
};

/**
 * Whether this session still holds the record for the exercise - what the
 * "Rekor Pribadi" badge on a logged session is based on. Two sessions that tie
 * both hold it.
 */
export function holdsRecord(
  session: Pick<ExerciseBests, "bestWeight" | "bestReps">,
  record: Pick<ExerciseRecord, "bodyweight" | "bestWeight" | "bestReps"> | undefined
): boolean {
  if (!record) return false;
  const matches = (session: number | null, best: number | null) =>
    session !== null && best !== null && Math.abs(session - best) <= RECORD_EPSILON;
  return record.bodyweight
    ? matches(session.bestReps, record.bestReps)
    : matches(session.bestWeight, record.bestWeight);
}

/**
 * What a session just beat. A weighted exercise can set a heaviest-weight and an
 * estimated-1RM record; a bodyweight one a reps record. Ties never count.
 */
export function detectNewRecords(previous: ExerciseBests, current: ExerciseBests): RecordHit[] {
  const hits: RecordHit[] = [];

  if (current.bestWeight !== null) {
    if (beats(current.bestWeight, previous.bestWeight)) {
      hits.push({ kind: "weight", value: current.bestWeight, previous: previous.bestWeight });
    }
    if (beats(current.bestOneRm, previous.bestOneRm)) {
      hits.push({ kind: "oneRm", value: current.bestOneRm as number, previous: previous.bestOneRm });
    }
    return hits;
  }

  if (beats(current.bestReps, previous.bestReps)) {
    hits.push({ kind: "reps", value: current.bestReps as number, previous: previous.bestReps });
  }
  return hits;
}
