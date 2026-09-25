import { describe, expect, it } from "vitest";
import { bestStreak, completionRate, currentStreak } from "./habits";

const set = (...days: string[]) => new Set(days);

describe("currentStreak", () => {
  it("counts back from today when today is done", () => {
    expect(currentStreak(set("2026-09-23", "2026-09-24", "2026-09-25"), "2026-09-25")).toBe(3);
  });

  it("keeps yesterday's streak alive while today is still open", () => {
    expect(currentStreak(set("2026-09-23", "2026-09-24"), "2026-09-25")).toBe(2);
  });

  it("is zero once a full day was missed", () => {
    expect(currentStreak(set("2026-09-22", "2026-09-23"), "2026-09-25")).toBe(0);
  });

  it("crosses month boundaries", () => {
    expect(currentStreak(set("2026-08-31", "2026-09-01"), "2026-09-01")).toBe(2);
  });
});

describe("bestStreak", () => {
  it("finds the longest run", () => {
    expect(bestStreak(set("2026-09-01", "2026-09-02", "2026-09-05", "2026-09-06", "2026-09-07"))).toBe(3);
  });

  it("is zero for no logs", () => {
    expect(bestStreak(set())).toBe(0);
  });
});

describe("completionRate", () => {
  it("only counts days since the habit was created", () => {
    // created 4 days ago (5 eligible days incl. today), done on 4 of them
    const done = set("2026-09-21", "2026-09-22", "2026-09-24", "2026-09-25");
    expect(completionRate(done, "2026-09-25", "2026-09-21")).toBe(0.8);
  });

  it("caps the window for older habits", () => {
    expect(completionRate(set("2026-09-25"), "2026-09-25", "2026-01-01", 10)).toBe(0.1);
  });
});
