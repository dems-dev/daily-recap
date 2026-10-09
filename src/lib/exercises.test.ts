import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import id from "../../messages/id.json";
import {
  bestsByExercise,
  computeExerciseBests,
  detectNewRecords,
  epley1Rm,
  EMPTY_BESTS,
  EXERCISE_PRESETS,
  normalizeExerciseName,
  ONE_RM_MAX_REPS,
  prepareExercises,
  presetById,
} from "./exercises";

describe("epley1Rm", () => {
  it("returns the weight itself for a single rep", () => {
    expect(epley1Rm(100, 1)).toBe(100);
  });

  it("estimates with weight x (1 + reps / 30)", () => {
    expect(epley1Rm(100, 5)).toBe(116.7); // 100 * 7/6 = 116.66…
    expect(epley1Rm(60, 8)).toBe(76);
    expect(epley1Rm(42.5, 3)).toBe(46.8);
  });

  it("stops estimating above the rep cap", () => {
    expect(ONE_RM_MAX_REPS).toBe(12);
    expect(epley1Rm(40, 12)).toBe(56); // boundary still counts
    expect(epley1Rm(40, 13)).toBeNull();
    expect(epley1Rm(40, 30)).toBeNull();
  });

  it("ignores sets without a usable weight or rep count", () => {
    expect(epley1Rm(0, 5)).toBeNull();
    expect(epley1Rm(-10, 5)).toBeNull();
    expect(epley1Rm(100, 0)).toBeNull();
    expect(epley1Rm(Number.NaN, 5)).toBeNull();
    expect(epley1Rm(100, Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("computeExerciseBests", () => {
  it("takes the heaviest set and the reps achieved at it", () => {
    const bests = computeExerciseBests([
      { reps: 10, weight: 50 },
      { reps: 5, weight: 70 },
      { reps: 6, weight: 70 },
    ]);
    expect(bests.bestWeight).toBe(70);
    expect(bests.bestWeightReps).toBe(6);
    expect(bests.bestReps).toBe(10);
  });

  it("takes the best 1RM estimate even when it comes from a lighter set", () => {
    // 60 x 10 -> 80.0 beats 70 x 2 -> 74.7
    const bests = computeExerciseBests([
      { reps: 2, weight: 70 },
      { reps: 10, weight: 60 },
    ]);
    expect(bests.bestWeight).toBe(70);
    expect(bests.bestOneRm).toBe(80);
  });

  it("counts a high-rep set towards reps but not towards 1RM", () => {
    const bests = computeExerciseBests([
      { reps: 20, weight: 40 },
      { reps: 8, weight: 50 },
    ]);
    expect(bests.bestReps).toBe(20);
    expect(bests.bestWeight).toBe(50);
    expect(bests.bestOneRm).toBe(63.3); // from 50 x 8 only
  });

  it("leaves 1RM empty when every weighted set is above the rep cap", () => {
    const bests = computeExerciseBests([{ reps: 25, weight: 20 }]);
    expect(bests.bestWeight).toBe(20);
    expect(bests.bestOneRm).toBeNull();
    expect(bests.bestReps).toBe(25);
  });

  it("measures bodyweight sets in reps", () => {
    const bests = computeExerciseBests([
      { reps: 20 },
      { reps: 18, weight: null },
      { reps: 15, weight: 0 },
    ]);
    expect(bests).toEqual({ ...EMPTY_BESTS, bestReps: 20 });
  });

  it("treats a mixed exercise as weighted but keeps the rep count", () => {
    const bests = computeExerciseBests([
      { reps: 12 },
      { reps: 5, weight: 10 },
    ]);
    expect(bests.bestWeight).toBe(10);
    expect(bests.bestReps).toBe(12);
    expect(bests.bestOneRm).toBe(11.7);
  });

  it("ignores sets with no reps, and empty input", () => {
    expect(computeExerciseBests([{ reps: 0, weight: 80 }])).toEqual(EMPTY_BESTS);
    expect(computeExerciseBests([])).toEqual(EMPTY_BESTS);
    expect(computeExerciseBests(null)).toEqual(EMPTY_BESTS);
  });
});

describe("detectNewRecords", () => {
  const weighted = { bestWeight: 80, bestWeightReps: 5, bestOneRm: 93.3, bestReps: 8 };

  it("reports a first-ever session as a record", () => {
    const hits = detectNewRecords(EMPTY_BESTS, weighted);
    expect(hits.map((hit) => hit.kind)).toEqual(["weight", "oneRm"]);
    expect(hits[0]).toEqual({ kind: "weight", value: 80, previous: null });
  });

  it("does not count a tie", () => {
    expect(detectNewRecords(weighted, weighted)).toEqual([]);
  });

  it("separates the weight record from the 1RM record", () => {
    const heavierOnly = { ...weighted, bestWeight: 85, bestOneRm: 90 };
    expect(detectNewRecords(weighted, heavierOnly)).toEqual([
      { kind: "weight", value: 85, previous: 80 },
    ]);

    const strongerEstimateOnly = { ...weighted, bestWeight: 75, bestOneRm: 95 };
    expect(detectNewRecords(weighted, strongerEstimateOnly)).toEqual([
      { kind: "oneRm", value: 95, previous: 93.3 },
    ]);
  });

  it("uses reps for a bodyweight exercise and never reports weight", () => {
    const previous = { ...EMPTY_BESTS, bestReps: 30 };
    expect(detectNewRecords(previous, { ...EMPTY_BESTS, bestReps: 31 })).toEqual([
      { kind: "reps", value: 31, previous: 30 },
    ]);
    expect(detectNewRecords(previous, { ...EMPTY_BESTS, bestReps: 30 })).toEqual([]);
  });

  it("does not report a reps record for a weighted exercise", () => {
    const more = { ...weighted, bestReps: 20 };
    expect(detectNewRecords(weighted, more)).toEqual([]);
  });

  it("ignores float noise below the epsilon", () => {
    const noisier = { ...weighted, bestOneRm: 93.3000001 };
    expect(detectNewRecords(weighted, noisier)).toEqual([]);
  });
});

describe("normalizeExerciseName", () => {
  it("collapses case, spacing and punctuation into one key", () => {
    const keys = ["Bench Press", "bench press", "  BENCH   press ", "Bench-Press", "bench_press!"].map(
      normalizeExerciseName
    );
    expect(new Set(keys).size).toBe(1);
    expect(keys[0]).toBe("bench-press");
  });

  it("maps common variants and short forms onto the preset", () => {
    expect(normalizeExerciseName("Push Ups")).toBe("push-up");
    expect(normalizeExerciseName("pushup")).toBe("push-up");
    expect(normalizeExerciseName("PUSH-UPS")).toBe("push-up");
    expect(normalizeExerciseName("OHP")).toBe("overhead-press");
    expect(normalizeExerciseName("Shoulder Press")).toBe("overhead-press");
    expect(normalizeExerciseName("bicep curls")).toBe("biceps-curl");
  });

  it("strips diacritics so typed accents do not split a record", () => {
    expect(normalizeExerciseName("Squät")).toBe("squat");
  });

  it("keeps an unknown name as its own slug", () => {
    expect(normalizeExerciseName("Sled Push")).toBe("sled-push");
    expect(normalizeExerciseName("   ")).toBe("");
  });
});

describe("exercise presets", () => {
  it("has unique ids", () => {
    const ids = EXERCISE_PRESETS.map((preset) => preset.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has an id and an en label for every preset", () => {
    const idLabels = (id as { Workout: { exercisePresets: Record<string, string> } }).Workout.exercisePresets;
    const enLabels = (en as { Workout: { exercisePresets: Record<string, string> } }).Workout.exercisePresets;
    for (const preset of EXERCISE_PRESETS) {
      expect(idLabels[preset.id], `messages/id.json is missing ${preset.id}`).toBeTruthy();
      expect(enLabels[preset.id], `messages/en.json is missing ${preset.id}`).toBeTruthy();
    }
    // No stale labels either, or the picker would show an exercise that cannot be saved.
    const presetIds = new Set(EXERCISE_PRESETS.map((preset) => preset.id));
    for (const key of Object.keys(enLabels)) expect(presetIds.has(key)).toBe(true);
  });

  it("normalises its own ids to themselves", () => {
    for (const preset of EXERCISE_PRESETS) {
      expect(normalizeExerciseName(preset.id)).toBe(preset.id);
      expect(presetById(preset.id)?.group).toBe(preset.group);
    }
  });
});

describe("prepareExercises", () => {
  it("normalises names, trims sets and summarises each row", () => {
    const [row] = prepareExercises("user-1", [
      { name: "  Bench press  ", sets: [{ reps: 8, weight: 60 }, { reps: 6 }] },
    ]);
    expect(row.userId).toBe("user-1");
    expect(row.name).toBe("Bench press");
    expect(row.canonicalName).toBe("bench-press");
    expect(row.sets).toEqual([
      { reps: 8, weight: 60 },
      { reps: 6, weight: null },
    ]);
    expect(row.order).toBe(0);
    expect(row.bestWeight).toBe(60);
    expect(row.bestOneRm).toBe(76);
  });

  it("merges a session that lists the same exercise twice", () => {
    const prepared = prepareExercises("user-1", [
      { name: "Bench Press", sets: [{ reps: 8, weight: 60 }] },
      { name: "bench press", sets: [{ reps: 3, weight: 80 }] },
      { name: "Push Up", sets: [{ reps: 25 }] },
    ]);
    const bests = bestsByExercise(prepared);
    expect([...bests.keys()].sort()).toEqual(["bench-press", "push-up"]);
    expect(bests.get("bench-press")?.bests.bestWeight).toBe(80);
    expect(bests.get("bench-press")?.bests.bestReps).toBe(8);
    expect(bests.get("push-up")?.bests).toEqual({ ...EMPTY_BESTS, bestReps: 25 });
  });
});
