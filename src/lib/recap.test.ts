import { describe, expect, it } from "vitest";
import { periodHighlights, periodRange, periodStats, previousRange } from "./recap";
import type { DayRow } from "./insights";

describe("periodRange", () => {
  it("starts weeks on Monday by default", () => {
    // Fri 25 Sep 2026
    expect(periodRange("week", "2026-09-25", "monday")).toEqual({ start: "2026-09-21", end: "2026-09-27" });
    expect(periodRange("week", "2026-09-21", "monday")).toEqual({ start: "2026-09-21", end: "2026-09-27" });
  });

  it("supports Sunday-start weeks", () => {
    expect(periodRange("week", "2026-09-25", "sunday")).toEqual({ start: "2026-09-20", end: "2026-09-26" });
  });

  it("covers whole months", () => {
    expect(periodRange("month", "2026-02-10", "monday")).toEqual({ start: "2026-02-01", end: "2026-02-28" });
  });

  it("finds the previous period", () => {
    expect(previousRange("week", "2026-09-21", "monday")).toEqual({ start: "2026-09-14", end: "2026-09-20" });
    expect(previousRange("month", "2026-03-01", "monday")).toEqual({ start: "2026-02-01", end: "2026-02-28" });
  });
});

const row = (patch: Partial<DayRow>): DayRow => ({
  date: "2026-09-01",
  weekday: 2,
  expense: 0,
  mood: null,
  habitsDone: 0,
  habitsTotal: 0,
  todosDone: 0,
  sleepMinutes: null,
  ...patch,
});

describe("periodStats", () => {
  it("aggregates rows", () => {
    const stats = periodStats(
      [
        row({ expense: 100, mood: 4, habitsDone: 1, habitsTotal: 2, todosDone: 2 }),
        row({ expense: 50, mood: 2, habitsDone: 2, habitsTotal: 2 }),
        row({}),
      ],
      1000
    );
    expect(stats).toEqual({
      days: 3,
      expense: 150,
      income: 1000,
      todosDone: 2,
      habitRate: 0.75,
      moodAvg: 3,
      moodDays: 2,
      sleepAvg: null,
      sleepNights: 0,
    });
  });
});

describe("periodHighlights", () => {
  const base = { days: 7, expense: 700, income: 0, todosDone: 5, habitRate: 0.8, moodAvg: 4, moodDays: 5, sleepAvg: 420, sleepNights: 7 };

  it("compares spending per day, not totals", () => {
    // 3 days at 100/day vs a full previous week at 100/day → no change mentioned
    const h = periodHighlights({ ...base, days: 3, expense: 300 }, base, null);
    expect(h.map((x) => x.key)).not.toContain("expenseUp");
    expect(h.map((x) => x.key)).not.toContain("expenseDown");
  });

  it("reports big changes", () => {
    const h = periodHighlights({ ...base, expense: 350, habitRate: 0.5 }, base, { category: "food", amount: 200 });
    expect(h).toContainEqual({ key: "expenseDown", params: { pct: 50 } });
    expect(h).toContainEqual({ key: "habitsDown", params: { points: 30 } });
    expect(h).toContainEqual({ key: "topCategory", params: { category: "food", amount: 200, pct: 57 } });
  });

  it("mentions sleep changes of 20+ minutes, otherwise the average", () => {
    expect(periodHighlights({ ...base, sleepAvg: 380 }, base, null)).toContainEqual({
      key: "sleepDown",
      params: { minutes: 380, diff: 40 },
    });
    expect(periodHighlights({ ...base, sleepAvg: 430 }, base, null)).toContainEqual({
      key: "sleepAvg",
      params: { minutes: 430, nights: 7 },
    });
  });

  it("leads with the week's priorities", () => {
    expect(periodHighlights(base, base, null, { done: 2, total: 3 })[0]).toEqual({
      key: "prioritiesDone",
      params: { done: 2, total: 3 },
    });
    expect(periodHighlights(base, base, null, { done: 3, total: 3 })[0].key).toBe("prioritiesAllDone");
    expect(periodHighlights(base, base, null, { done: 0, total: 0 }).map((h) => h.key)).not.toContain("prioritiesDone");
  });

  it("nudges when no mood was logged", () => {
    const h = periodHighlights({ ...base, moodAvg: null, moodDays: 0 }, base, null);
    expect(h.map((x) => x.key)).toContain("noMood");
  });
});
