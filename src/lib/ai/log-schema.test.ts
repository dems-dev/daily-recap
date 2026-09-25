import { describe, expect, it } from "vitest";
import { aiLogSchema, toQuickAdds, type AiLog } from "./log-schema";

const ctx = { today: "2026-09-25", habits: [{ name: "Olahraga 30 menit" }, { name: "Minum 8 gelas air" }] };
const log = (entries: AiLog["entries"], notUnderstood: string[] = []): AiLog => ({ entries, notUnderstood });

describe("aiLogSchema", () => {
  it("accepts a realistic model response", () => {
    const parsed = aiLogSchema.safeParse({
      entries: [
        { kind: "expense", amount: 45000, category: "food", description: "makan siang sama tim", daysAgo: 0 },
        { kind: "sleep", bedtime: "01:00", wakeTime: "07:00" },
        { kind: "mood", mood: "good", note: "capek tapi senang" },
      ],
      notUnderstood: [],
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects unknown kinds", () => {
    expect(aiLogSchema.safeParse({ entries: [{ kind: "delete_everything" }], notUnderstood: [] }).success).toBe(false);
  });
});

describe("toQuickAdds", () => {
  it("maps money with relative dates and falls back on unknown categories", () => {
    const { items } = toQuickAdds(
      log([
        { kind: "expense", amount: 30000, category: "transport", description: "bensin", daysAgo: 1 },
        { kind: "income", amount: 500000, category: "lottery", description: "menang", daysAgo: 0 },
      ]),
      ctx
    );
    expect(items).toEqual([
      { kind: "expense", amount: 30000, category: "transport", description: "bensin", date: "2026-09-24" },
      { kind: "income", amount: 500000, category: "other-income", description: "menang", date: "2026-09-25" },
    ]);
  });

  it("rejects impossible values instead of guessing", () => {
    const { items, rejected } = toQuickAdds(
      log([
        { kind: "expense", amount: -5, category: "food", description: "x", daysAgo: 0 },
        { kind: "expense", amount: 5, category: "food", description: "x", daysAgo: 30 },
        { kind: "sleep", bedtime: "25:00", wakeTime: "07:00" },
        { kind: "habit", habitName: "Terbang" },
      ]),
      ctx
    );
    expect(items).toEqual([]);
    expect(rejected.map((r) => r.reason)).toEqual(["invalidAmount", "invalidDate", "invalidTime", "unknownHabit"]);
  });

  it("matches habits by name and computes due dates", () => {
    const { items } = toQuickAdds(
      log([
        { kind: "habit", habitName: "olahraga" },
        { kind: "todo", title: "  kirim invoice ", dueInDays: 1 },
        { kind: "todo", title: "beli kado", dueInDays: null },
      ]),
      ctx
    );
    expect(items).toEqual([
      { kind: "habit", query: "Olahraga 30 menit" },
      { kind: "todo", title: "kirim invoice", dueDate: "2026-09-26" },
      { kind: "todo", title: "beli kado", dueDate: null },
    ]);
  });

  it("keeps only the last mood and sleep", () => {
    const { items } = toQuickAdds(
      log([
        { kind: "mood", mood: "bad", note: "pagi" },
        { kind: "sleep", bedtime: "23:00", wakeTime: "06:00" },
        { kind: "mood", mood: "good", note: "malam" },
      ]),
      ctx
    );
    expect(items).toEqual([
      { kind: "sleep", bedtime: "23:00", wakeTime: "06:00" },
      { kind: "mood", mood: "good", note: "malam" },
    ]);
  });
});
