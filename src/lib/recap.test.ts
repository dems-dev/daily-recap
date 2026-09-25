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
    });
  });
});

describe("periodHighlights", () => {
  const base = { days: 7, expense: 700, income: 0, todosDone: 5, habitRate: 0.8, moodAvg: 4, moodDays: 5 };

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

  it("nudges when no mood was logged", () => {
    const h = periodHighlights({ ...base, moodAvg: null, moodDays: 0 }, base, null);
    expect(h.map((x) => x.key)).toContain("noMood");
  });
});
