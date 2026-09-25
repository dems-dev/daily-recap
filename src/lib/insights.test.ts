import { describe, expect, it } from "vitest";
import { computeInsights, percentChange, type DayRow } from "./insights";

function day(i: number, patch: Partial<DayRow> = {}): DayRow {
  const date = new Date(Date.UTC(2026, 6, 1 + i)); // from Wed 1 Jul 2026
  return {
    date: date.toISOString().slice(0, 10),
    weekday: date.getUTCDay(),
    expense: 100_000,
    mood: null,
    habitsDone: 0,
    habitsTotal: 0,
    todosDone: 1,
    ...patch,
  };
}

const keys = (rows: DayRow[]) => computeInsights(rows).map((i) => i.key);

describe("computeInsights", () => {
  it("says nothing without enough data", () => {
    expect(keys([day(0, { mood: 1, expense: 900_000 }), day(1, { mood: 5 })])).toEqual([]);
  });

  it("finds higher spending on bad-mood days", () => {
    const rows = [
      ...Array.from({ length: 5 }, (_, i) => day(i, { mood: 2, expense: 300_000 })),
      ...Array.from({ length: 5 }, (_, i) => day(i + 5, { mood: 5, expense: 100_000 })),
    ];
    const insight = computeInsights(rows).find((i) => i.key === "spendMoreOnBadDays");
    expect(insight?.params).toMatchObject({ pct: 200, badAvg: 300_000, goodAvg: 100_000 });
  });

  it("ignores small spending differences", () => {
    const rows = [
      ...Array.from({ length: 5 }, (_, i) => day(i, { mood: 2, expense: 110_000 })),
      ...Array.from({ length: 5 }, (_, i) => day(i + 5, { mood: 5, expense: 100_000 })),
    ];
    expect(keys(rows)).not.toContain("spendMoreOnBadDays");
  });

  it("links habit completion to mood", () => {
    const rows = [
      ...Array.from({ length: 5 }, (_, i) => day(i, { mood: 5, habitsDone: 4, habitsTotal: 4 })),
      ...Array.from({ length: 5 }, (_, i) => day(i + 5, { mood: 3, habitsDone: 1, habitsTotal: 4 })),
    ];
    expect(computeInsights(rows).find((i) => i.key === "betterMoodWithHabits")?.params).toMatchObject({
      delta: 2,
    });
  });

  it("finds a standout productive weekday over several weeks", () => {
    const rows = Array.from({ length: 35 }, (_, i) => {
      const d = day(i);
      return { ...d, todosDone: d.weekday === 2 ? 6 : 1 }; // Tuesdays
    });
    expect(computeInsights(rows).find((i) => i.key === "mostProductiveDay")?.params.weekday).toBe(2);
  });

  it("orders by strength and keeps the consistency nudge last", () => {
    const rows = Array.from({ length: 30 }, (_, i) =>
      day(i, { mood: i % 2 ? 2 : 5, expense: i % 2 ? 400_000 : 50_000 })
    );
    const result = keys(rows);
    expect(result[0]).toBe("spendMoreOnBadDays");
    expect(result.at(-1)).toBe("journalConsistency");
  });
});

describe("percentChange", () => {
  it("handles a missing baseline", () => {
    expect(percentChange(120, 100)).toBe(20);
    expect(percentChange(80, 100)).toBe(-20);
    expect(percentChange(50, 0)).toBeNull();
  });
});
