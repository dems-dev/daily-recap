import prisma from "@/lib/prisma";
import { addDays, dateKeyToDate, dateToKey, type DateKey } from "@/lib/date";
import {
  bestsByExercise,
  detectNewRecords,
  EMPTY_BESTS,
  prepareExercises,
  type ExerciseBests,
  type ExerciseInput,
  type ExerciseRecord,
  type HistoryPoint,
  type RecordHit,
} from "@/lib/exercises";

/** Default window for the per-exercise progress chart. */
export const HISTORY_DAYS = 180;

/**
 * How many recent exercise rows are scanned to find each exercise's latest
 * entry (its display name and "last time you did" hint). The records themselves
 * come from an aggregate, so they stay exact beyond this window.
 */
const LATEST_ROWS_SCANNED = 500;

/** Shape selected for both the latest-entry scan and the history query. */
export type ExerciseRow = {
  userId: string | null;
  canonicalName: string | null;
  name: string;
  bestWeight: number | null;
  bestWeightReps: number | null;
  bestOneRm: number | null;
  bestReps: number | null;
  workout: { date: Date };
};

/** One row per exercise, as returned by the aggregate. */
export type ExerciseMaxRow = {
  userId: string | null;
  canonicalName: string | null;
  _max: {
    bestWeight: number | null;
    bestOneRm: number | null;
    bestReps: number | null;
  };
  _count: { _all: number };
};

export type { ExerciseRecord, HistoryPoint } from "@/lib/exercises";

/**
 * Every record query is scoped to one user in SQL; this is the second gate, so
 * a dropped `where` clause cannot leak another user's rows into a response.
 */
export function ownedRows<T extends { userId: string | null }>(
  userId: string,
  rows: readonly T[]
): T[] {
  if (!userId) throw new Error("exercise records query without a user id");
  return rows.filter((row) => row.userId === userId);
}

/** Merges the aggregate maxima with each exercise's latest entry. */
export function shapeRecords(
  userId: string,
  maxima: readonly ExerciseMaxRow[],
  latest: readonly ExerciseRow[]
): ExerciseRecord[] {
  const owned = ownedRows(userId, latest);
  const latestByName = new Map<string, ExerciseRow>();
  for (const row of owned) {
    if (!row.canonicalName) continue;
    if (!latestByName.has(row.canonicalName)) latestByName.set(row.canonicalName, row);
  }

  const records: ExerciseRecord[] = [];
  for (const group of ownedRows(userId, maxima)) {
    const canonicalName = group.canonicalName;
    if (!canonicalName) continue;
    const last = latestByName.get(canonicalName);
    records.push({
      canonicalName,
      name: last?.name ?? canonicalName,
      bodyweight: group._max.bestWeight === null,
      bestWeight: group._max.bestWeight,
      bestOneRm: group._max.bestOneRm,
      bestReps: group._max.bestReps,
      sessions: group._count._all,
      lastDate: last ? dateToKey(last.workout.date) : ("" as DateKey),
      lastWeight: last?.bestWeight ?? null,
      lastWeightReps: last?.bestWeightReps ?? null,
      lastReps: last?.bestReps ?? null,
    });
  }

  return records.sort((a, b) => (a.lastDate === b.lastDate ? a.name.localeCompare(b.name) : b.lastDate.localeCompare(a.lastDate)));
}

/** Chart series for one exercise, oldest first. */
export function historyPoints(
  userId: string,
  canonicalName: string,
  rows: readonly ExerciseRow[]
): HistoryPoint[] {
  return ownedRows(userId, rows)
    .filter((row) => row.canonicalName === canonicalName)
    .map((row) => ({
      date: dateToKey(row.workout.date),
      weight: row.bestWeight,
      oneRm: row.bestOneRm,
      reps: row.bestReps,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

const ROW_SELECT = {
  userId: true,
  canonicalName: true,
  name: true,
  bestWeight: true,
  bestWeightReps: true,
  bestOneRm: true,
  bestReps: true,
  workout: { select: { date: true } },
} as const;

/**
 * Personal records for every exercise the user has logged: one aggregate over
 * the stored per-session summaries, so no `sets` JSON is parsed and no history
 * is shipped anywhere.
 */
export async function getExerciseRecords(userId: string): Promise<ExerciseRecord[]> {
  if (!userId) throw new Error("exercise records query without a user id");

  const [maxima, latest] = await Promise.all([
    prisma.exercise.groupBy({
      by: ["userId", "canonicalName"],
      where: { userId, canonicalName: { not: null } },
      _max: { bestWeight: true, bestOneRm: true, bestReps: true },
      _count: { _all: true },
    }),
    prisma.exercise.findMany({
      where: { userId, canonicalName: { not: null } },
      orderBy: [{ workout: { date: "desc" } }, { order: "asc" }],
      take: LATEST_ROWS_SCANNED,
      select: ROW_SELECT,
    }),
  ]);

  return shapeRecords(userId, maxima, latest);
}

/** History for one exercise: only the summary columns, for one canonical name. */
export async function getExerciseHistory(
  userId: string,
  canonicalName: string,
  today: DateKey,
  days = HISTORY_DAYS
): Promise<HistoryPoint[]> {
  if (!userId) throw new Error("exercise records query without a user id");
  if (!canonicalName) return [];

  const rows = await prisma.exercise.findMany({
    where: {
      userId,
      canonicalName,
      workout: { date: { gte: dateKeyToDate(addDays(today, -days)) } },
    },
    orderBy: { workout: { date: "asc" } },
    take: 400,
    select: ROW_SELECT,
  });

  return historyPoints(userId, canonicalName, rows);
}

/**
 * The bests to beat, per exercise, as recorded right now. Called before the new
 * rows are written, so an edited session is still compared against its own
 * previous numbers - lowering a session's weight does not re-announce a record.
 */
export async function previousBestsFor(
  userId: string,
  canonicalNames: readonly string[]
): Promise<Map<string, ExerciseBests>> {
  if (!userId) throw new Error("exercise records query without a user id");
  const names = [...new Set(canonicalNames.filter(Boolean))];
  if (!names.length) return new Map();

  const maxima = await prisma.exercise.groupBy({
    by: ["userId", "canonicalName"],
    where: { userId, canonicalName: { in: names } },
    _max: { bestWeight: true, bestOneRm: true, bestReps: true },
  });

  const previous = new Map<string, ExerciseBests>();
  for (const group of ownedRows(userId, maxima)) {
    if (!group.canonicalName) continue;
    previous.set(group.canonicalName, {
      bestWeight: group._max.bestWeight,
      bestWeightReps: null,
      bestOneRm: group._max.bestOneRm,
      bestReps: group._max.bestReps,
    });
  }
  for (const name of names) if (!previous.has(name)) previous.set(name, { ...EMPTY_BESTS });

  return previous;
}

export type NewRecord = RecordHit & { canonicalName: string; name: string };

/**
 * Replaces a session's exercises and reports the records it beat. The bests to
 * beat are read before the new rows land, so a save is judged against
 * everything recorded until that moment.
 */
export async function replaceExercises(
  userId: string,
  workoutId: string,
  inputs: readonly ExerciseInput[]
): Promise<NewRecord[]> {
  if (!userId) throw new Error("exercise write without a user id");

  // Callers gate on ownership already; this keeps a future caller from deleting
  // another user's exercises by passing their workout id.
  const owned = await prisma.workout.findFirst({
    where: { id: workoutId, userId },
    select: { id: true },
  });
  if (!owned) throw new Error("workout not found");

  const prepared = prepareExercises(userId, inputs);
  const sessionBests = bestsByExercise(prepared);
  const previous = await previousBestsFor(userId, [...sessionBests.keys()]);

  await prisma.$transaction([
    prisma.exercise.deleteMany({ where: { workoutId } }),
    ...(prepared.length
      ? [
          prisma.exercise.createMany({
            data: prepared.map((exercise) => ({
              workoutId,
              userId: exercise.userId,
              name: exercise.name,
              canonicalName: exercise.canonicalName,
              sets: exercise.sets,
              order: exercise.order,
              bestWeight: exercise.bestWeight,
              bestWeightReps: exercise.bestWeightReps,
              bestOneRm: exercise.bestOneRm,
              bestReps: exercise.bestReps,
            })),
          }),
        ]
      : []),
  ]);

  const records: NewRecord[] = [];
  for (const [canonicalName, { name, bests }] of sessionBests) {
    const before = previous.get(canonicalName) ?? EMPTY_BESTS;
    for (const hit of detectNewRecords(before, bests)) {
      records.push({ ...hit, canonicalName, name });
    }
  }
  return records;
}
