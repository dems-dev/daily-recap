import { describe, expect, it } from "vitest";
import { matchHabit, parseAmount, parseQuickAdd } from "./quick-add";

const TODAY = "2026-09-25";

describe("parseAmount", () => {
  it.each([
    ["25", "rb", 25_000],
    ["25", "k", 25_000],
    ["1,5", "jt", 1_500_000],
    ["1.5", "jt", 1_500_000],
    ["2", "juta", 2_000_000],
    ["25.000", undefined, 25_000],
    ["1.250.000", undefined, 1_250_000],
    ["150000", undefined, 150_000],
    ["12,5", undefined, 12.5],
  ])("%s %s → %d", (n, s, expected) => {
    expect(parseAmount(n, s)).toBe(expected);
  });

  it("rejects zero", () => {
    expect(parseAmount("0", "rb")).toBeNull();
  });
});

describe("parseQuickAdd — money", () => {
  it("parses an expense and guesses the category", () => {
    expect(parseQuickAdd("-25rb kopi susu", TODAY)).toEqual({
      kind: "expense",
      amount: 25_000,
      category: "food",
      description: "kopi susu",
      date: TODAY,
    });
  });

  it("parses income", () => {
    expect(parseQuickAdd("+5jt gaji september", TODAY)).toMatchObject({
      kind: "income",
      amount: 5_000_000,
      category: "salary",
    });
  });

  it("understands 'kemarin' and removes it from the description", () => {
    expect(parseQuickAdd("-1,5jt sewa kos kemarin", TODAY)).toMatchObject({
      amount: 1_500_000,
      category: "bills",
      description: "sewa kos",
      date: "2026-09-24",
    });
  });

  it("falls back to 'other' categories", () => {
    expect(parseQuickAdd("-10000 sesuatu", TODAY)).toMatchObject({ category: "other-expense", amount: 10_000 });
    expect(parseQuickAdd("+50rb", TODAY)).toMatchObject({ category: "other-income", description: "" });
  });

  it("refuses money in the future", () => {
    expect(parseQuickAdd("-25rb kopi besok", TODAY)).toBeNull();
  });

  it("does not treat a word starting with k as the thousands suffix", () => {
    expect(parseQuickAdd("-25 kopi", TODAY)).toMatchObject({ amount: 25, description: "kopi" });
  });
});

describe("parseQuickAdd — other commands", () => {
  it("creates todos with due dates", () => {
    expect(parseQuickAdd("todo beli sayur besok", TODAY)).toEqual({
      kind: "todo",
      title: "beli sayur",
      dueDate: "2026-09-26",
    });
    expect(parseQuickAdd("t telepon ibu", TODAY)).toEqual({ kind: "todo", title: "telepon ibu", dueDate: null });
    expect(parseQuickAdd("tugas lusa", TODAY)).toBeNull(); // nothing left for a title
  });

  it("checks habits", () => {
    expect(parseQuickAdd("done minum air", TODAY)).toEqual({ kind: "habit", query: "minum air" });
    expect(parseQuickAdd("✓olahraga", TODAY)).toEqual({ kind: "habit", query: "olahraga" });
  });

  it("sets the mood", () => {
    expect(parseQuickAdd("mood baik capek tapi senang", TODAY)).toEqual({
      kind: "mood",
      mood: "good",
      note: "capek tapi senang",
    });
    expect(parseQuickAdd("mood ???", TODAY)).toBeNull();
  });

  it("logs sleep from two clock times", () => {
    expect(parseQuickAdd("tidur 23:30 06:15", TODAY)).toEqual({ kind: "sleep", bedtime: "23:30", wakeTime: "06:15" });
    expect(parseQuickAdd("sleep 1.05 - 7.40", TODAY)).toEqual({ kind: "sleep", bedtime: "01:05", wakeTime: "07:40" });
    expect(parseQuickAdd("tidur 25:00 06:00", TODAY)).toBeNull();
  });

  it("adds wishlist items with a guessed category", () => {
    expect(parseQuickAdd("wish 350rb sepatu lari", TODAY)).toEqual({
      kind: "wish",
      price: 350_000,
      name: "sepatu lari",
      category: "shopping",
    });
    expect(parseQuickAdd("mau beli 1,2jt kursus desain", TODAY)).toMatchObject({ price: 1_200_000, category: "education" });
    expect(parseQuickAdd("wish 350rb", TODAY)).toBeNull();
  });

  it("adds weekly priorities", () => {
    expect(parseQuickAdd("prioritas selesaikan laporan Q3", TODAY)).toEqual({
      kind: "priority",
      title: "selesaikan laporan Q3",
    });
  });

  it("returns null for plain text", () => {
    expect(parseQuickAdd("halo", TODAY)).toBeNull();
    expect(parseQuickAdd("   ", TODAY)).toBeNull();
  });
});

describe("matchHabit", () => {
  const habits = [{ name: "Minum 8 gelas air" }, { name: "Olahraga" }, { name: "Baca buku" }];

  it("prefers exact, then prefix, then substring", () => {
    expect(matchHabit(habits, "olahraga")?.name).toBe("Olahraga");
    expect(matchHabit(habits, "baca")?.name).toBe("Baca buku");
    expect(matchHabit(habits, "air")?.name).toBe("Minum 8 gelas air");
    expect(matchHabit(habits, "tidur")).toBeNull();
  });
});
