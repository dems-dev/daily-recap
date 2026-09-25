import { describe, expect, it } from "vitest";
import { analyticsSeries } from "./analytics";
import type { DayRow } from "./insights";

const row = (date: string, patch: Partial<DayRow> = {}): DayRow => ({
  date,
  weekday: new Date(`${date}T00:00:00Z`).getUTCDay(),
  expense: 0,
  mood: null,
  habitsDone: 0,
  habitsTotal: 0,
  todosDone: 0,
  sleepMinutes: null,
  ...patch,
});

describe("analyticsSeries", () => {
  it("averages expense per mood", () => {
    const { expenseByMood } = analyticsSeries([
      row("2026-09-01", { mood: 2, expense: 100 }),
      row("2026-09-02", { mood: 2, expense: 300 }),
      row("2026-09-03", { mood: 5, expense: 50 }),
      row("2026-09-04", { expense: 999 }), // no mood → ignored
    ]);
    expect(expenseByMood.find((m) => m.mood === 2)).toEqual({ mood: 2, days: 2, avgExpense: 200 });
    expect(expenseByMood.find((m) => m.mood === 1)).toEqual({ mood: 1, days: 0, avgExpense: null });
  });

  it("computes habit completion per weekday, Monday first", () => {
    const { habitByWeekday } = analyticsSeries([
      row("2026-09-21", { habitsDone: 1, habitsTotal: 2 }), // Monday
      row("2026-09-28", { habitsDone: 2, habitsTotal: 2 }), // Monday
    ]);
    expect(habitByWeekday[0]).toEqual({ weekday: 1, rate: 0.75 });
    expect(habitByWeekday[1]).toEqual({ weekday: 2, rate: null });
  });

  it("needs 3 moods in the window for a rolling average", () => {
    const { moodTrend } = analyticsSeries([
      row("2026-09-01", { mood: 4 }),
      row("2026-09-02", { mood: 2 }),
      row("2026-09-03"),
      row("2026-09-04", { mood: 3 }),
    ]);
    expect(moodTrend.map((m) => m.avg7)).toEqual([null, null, null, 3]);
  });

  it("buckets mood by sleep length", () => {
    const { moodBySleep } = analyticsSeries([
      row("2026-09-01", { mood: 2, sleepMinutes: 300 }),
      row("2026-09-02", { mood: 5, sleepMinutes: 450 }),
      row("2026-09-03", { mood: 3, sleepMinutes: 450 }),
      row("2026-09-04", { sleepMinutes: 500 }), // no mood → ignored
    ]);
    expect(moodBySleep).toEqual([
      { bucket: "lt6", days: 1, avgMood: 2 },
      { bucket: "6to7", days: 0, avgMood: null },
      { bucket: "7to8", days: 2, avgMood: 4 },
      { bucket: "gte8", days: 0, avgMood: null },
    ]);
  });

  it("totals spending per month", () => {
    const { monthlyExpense } = analyticsSeries([
      row("2026-08-31", { expense: 10 }),
      row("2026-09-01", { expense: 5 }),
      row("2026-09-02", { expense: 5 }),
    ]);
    expect(monthlyExpense).toEqual([
      { month: "2026-08", expense: 10 },
      { month: "2026-09", expense: 10 },
    ]);
  });
});
