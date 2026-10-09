import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { loadEnvConfig } from "@next/env";
import { todayKey } from "./date";

/**
 * The one test here that needs a real database: that the record queries never
 * cross accounts, which is a property of the SQL, not of the shaping.
 *
 * It loads env the way Next.js does. Under `NODE_ENV=test` that deliberately
 * skips `.env.local` (where `vercel env pull` leaves the production URL), so
 * this only ever runs against the local Postgres from docker-compose.yml, and
 * skips itself anywhere else.
 */
loadEnvConfig(process.cwd(), true, { info: () => {}, error: () => {} });

const LOCAL_DB = /@(localhost|127\.0\.0\.1):5433\//.test(process.env.DATABASE_URL ?? "");

type Prisma = typeof import("./prisma").default;
type Records = typeof import("./workout-records");

describe.skipIf(!LOCAL_DB)("exercise records against local Postgres", () => {
  let prisma: Prisma;
  let records: Records;
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const emails = [`vitest-a-${suffix}@local.test`, `vitest-b-${suffix}@local.test`];
  const ids: string[] = [];
  const today = todayKey("UTC");

  beforeAll(async () => {
    prisma = (await import("./prisma")).default;
    records = await import("./workout-records");

    for (const email of emails) {
      const user = await prisma.user.create({
        data: { email, name: "vitest", password: "not-a-real-hash" },
      });
      ids.push(user.id);
    }
    const [userA, userB] = ids;

    const workoutA = await prisma.workout.create({
      data: { userId: userA, name: "Push Day", type: "strength", date: new Date(`${today}T00:00:00.000Z`) },
    });
    const workoutB = await prisma.workout.create({
      data: { userId: userB, name: "Push Day", type: "strength", date: new Date(`${today}T00:00:00.000Z`) },
    });

    await records.replaceExercises(userA, workoutA.id, [
      { name: "Bench Press", sets: [{ reps: 8, weight: 60 }] },
      { name: "Push Up", sets: [{ reps: 25 }] },
    ]);
    await records.replaceExercises(userB, workoutB.id, [
      { name: "bench press", sets: [{ reps: 3, weight: 180 }] },
    ]);
  });

  afterAll(async () => {
    if (ids.length) await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  it("returns only the records of the user asked for", async () => {
    const [userA, userB] = ids;

    const mine = await records.getExerciseRecords(userA);
    expect(mine.map((record) => record.canonicalName).sort()).toEqual(["bench-press", "push-up"]);
    const bench = mine.find((record) => record.canonicalName === "bench-press");
    expect(bench?.bestWeight).toBe(60);
    expect(bench?.bestOneRm).toBe(76);
    expect(mine.some((record) => (record.bestWeight ?? 0) >= 180)).toBe(false);

    const theirs = await records.getExerciseRecords(userB);
    expect(theirs.map((record) => record.canonicalName)).toEqual(["bench-press"]);
    expect(theirs[0].bestWeight).toBe(180);
  });

  it("keeps the other account out of the per-exercise history", async () => {
    const [userA, userB] = ids;

    const mine = await records.getExerciseHistory(userA, "bench-press", today);
    expect(mine).toHaveLength(1);
    expect(mine[0].weight).toBe(60);

    const theirs = await records.getExerciseHistory(userB, "bench-press", today);
    expect(theirs).toHaveLength(1);
    expect(theirs[0].weight).toBe(180);
  });

  it("does not leak another account into the bests a save is judged against", async () => {
    const [userA] = ids;
    const previous = await records.previousBestsFor(userA, ["bench-press"]);
    expect(previous.get("bench-press")).toMatchObject({ bestWeight: 60, bestOneRm: 76 });
  });

  it("reports the first logged session as a record, and a repeat as none", async () => {
    const [userA] = ids;
    const workout = await prisma.workout.create({
      data: { userId: userA, name: "Leg Day", type: "strength", date: new Date(`${today}T00:00:00.000Z`) },
    });

    const first = await records.replaceExercises(userA, workout.id, [
      { name: "Squat", sets: [{ reps: 5, weight: 100 }] },
    ]);
    expect(first.map((hit) => hit.kind)).toEqual(["weight", "oneRm"]);
    expect(first[0]).toMatchObject({ canonicalName: "squat", value: 100, previous: null });

    const again = await records.replaceExercises(userA, workout.id, [
      { name: "Squat", sets: [{ reps: 5, weight: 100 }] },
    ]);
    expect(again).toEqual([]);
  });

  it("refuses to write exercises into another account's session", async () => {
    const [userA, userB] = ids;
    const workout = await prisma.workout.create({
      data: { userId: userA, name: "Private", type: "strength", date: new Date(`${today}T00:00:00.000Z`) },
    });

    await expect(
      records.replaceExercises(userB, workout.id, [{ name: "Deadlift", sets: [{ reps: 1, weight: 200 }] }])
    ).rejects.toThrow(/not found/);
    expect(await prisma.exercise.count({ where: { workoutId: workout.id } })).toBe(0);
  });
});
