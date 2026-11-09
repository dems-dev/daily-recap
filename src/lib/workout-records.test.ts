import { describe, expect, it } from "vitest";
import { EMPTY_BESTS } from "./exercises";
import {
  historyPoints,
  ownedRows,
  shapeRecords,
  type ExerciseMaxRow,
  type ExerciseRow,
} from "./workout-records";

const row = (
  userId: string,
  canonicalName: string,
  date: string,
  values: Partial<ExerciseRow> = {}
): ExerciseRow => ({
  userId,
  canonicalName,
  name: canonicalName,
  bestWeight: null,
  bestWeightReps: null,
  bestOneRm: null,
  bestReps: null,
  workout: { date: new Date(`${date}T00:00:00.000Z`) },
  ...values,
});

const maxRow = (
  userId: string,
  canonicalName: string,
  max: Partial<ExerciseMaxRow["_max"]>,
  sessions = 1
): ExerciseMaxRow => ({
  userId,
  canonicalName,
  _max: { bestWeight: null, bestOneRm: null, bestReps: null, ...max },
  _count: { _all: sessions },
});

describe("shapeRecords", () => {
  it("merges the aggregate with the latest entry of each exercise", () => {
    const records = shapeRecords(
      "user-a",
      [maxRow("user-a", "bench-press", { bestWeight: 80, bestOneRm: 93.3, bestReps: 10 }, 7)],
      [
        row("user-a", "bench-press", "2026-10-08", {
          name: "Bench Press",
          bestWeight: 75,
          bestWeightReps: 8,
          bestReps: 8,
        }),
        row("user-a", "bench-press", "2026-09-01", { name: "bench press", bestWeight: 80 }),
      ]
    );

    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      canonicalName: "bench-press",
      name: "Bench Press", // the most recent spelling
      bodyweight: false,
      bestWeight: 80,
      bestOneRm: 93.3,
      bestReps: 10,
      sessions: 7,
      lastDate: "2026-10-08",
      lastWeight: 75,
      lastWeightReps: 8,
    });
  });

  it("marks an exercise with no weighted session as bodyweight", () => {
    const [record] = shapeRecords(
      "user-a",
      [maxRow("user-a", "push-up", { bestReps: 32 })],
      [row("user-a", "push-up", "2026-10-07", { name: "Push Up", bestReps: 32 })]
    );
    expect(record.bodyweight).toBe(true);
    expect(record.bestWeight).toBeNull();
    expect(record.bestReps).toBe(32);
  });

  it("sorts the most recently trained exercise first", () => {
    const records = shapeRecords(
      "user-a",
      [maxRow("user-a", "squat", { bestWeight: 100 }), maxRow("user-a", "deadlift", { bestWeight: 120 })],
      [
        row("user-a", "deadlift", "2026-10-01"),
        row("user-a", "squat", "2026-10-06"),
      ]
    );
    expect(records.map((record) => record.canonicalName)).toEqual(["squat", "deadlift"]);
  });
});

describe("records stay inside one account", () => {
  const mixedMaxima = [
    maxRow("user-a", "bench-press", { bestWeight: 80, bestOneRm: 93.3 }),
    maxRow("user-b", "bench-press", { bestWeight: 180, bestOneRm: 210 }),
    maxRow("user-b", "squat", { bestWeight: 200 }),
  ];
  const mixedRows = [
    row("user-b", "bench-press", "2026-10-09", { name: "B bench", bestWeight: 180 }),
    row("user-a", "bench-press", "2026-10-08", { name: "A bench", bestWeight: 80 }),
    row("user-b", "squat", "2026-10-07", { name: "B squat", bestWeight: 200 }),
  ];

  it("drops another user's rows even when they are handed in", () => {
    const records = shapeRecords("user-a", mixedMaxima, mixedRows);

    expect(records.map((record) => record.canonicalName)).toEqual(["bench-press"]);
    expect(records[0].name).toBe("A bench");
    expect(records[0].bestWeight).toBe(80);
    expect(JSON.stringify(records)).not.toContain("user-b");
    expect(JSON.stringify(records)).not.toContain("180");
  });

  it("keeps another user's sessions out of the history of the same exercise", () => {
    const points = historyPoints("user-a", "bench-press", mixedRows);
    expect(points).toEqual([{ date: "2026-10-08", weight: 80, oneRm: null, reps: null }]);
  });

  it("refuses to shape anything without a user id", () => {
    expect(() => ownedRows("", mixedRows)).toThrow(/user id/);
    expect(() => shapeRecords("", mixedMaxima, mixedRows)).toThrow(/user id/);
    expect(() => historyPoints("", "bench-press", mixedRows)).toThrow(/user id/);
  });
});

describe("historyPoints", () => {
  it("returns one point per session, oldest first", () => {
    const points = historyPoints("user-a", "push-up", [
      row("user-a", "push-up", "2026-10-05", { bestReps: 28 }),
      row("user-a", "push-up", "2026-09-20", { bestReps: 24 }),
      row("user-a", "pull-up", "2026-10-06", { bestReps: 12 }),
    ]);
    expect(points).toEqual([
      { date: "2026-09-20", weight: null, oneRm: null, reps: 24 },
      { date: "2026-10-05", weight: null, oneRm: null, reps: 28 },
    ]);
  });

  it("is empty for an exercise that was never logged", () => {
    expect(historyPoints("user-a", "sled-push", [row("user-a", "squat", "2026-10-01")])).toEqual([]);
  });
});

describe("EMPTY_BESTS", () => {
  it("is the shape the aggregate falls back to", () => {
    expect(EMPTY_BESTS).toEqual({
      bestWeight: null,
      bestWeightReps: null,
      bestOneRm: null,
      bestReps: null,
    });
  });
});
