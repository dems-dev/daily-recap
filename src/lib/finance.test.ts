import { describe, expect, it } from "vitest";
import { budgetSchema, savingsDepositSchema, transactionSchema } from "./finance";
import { summarizeMonth } from "./finance-summary";

describe("summarizeMonth", () => {
  const txs = [
    { type: "income", amount: 10_000_000, category: "salary", date: "2026-09-01" },
    { type: "expense", amount: 300_000, category: "food", date: "2026-09-01" },
    { type: "expense", amount: 200_000, category: "food", date: "2026-09-10" },
    { type: "expense", amount: 1_000_000, category: "bills", date: "2026-09-10" },
  ];

  it("totals income, expense and balance", () => {
    const { summary } = summarizeMonth(txs, "2026-09", "2026-09-10");
    expect(summary).toMatchObject({ income: 10_000_000, expense: 1_500_000, balance: 8_500_000 });
  });

  it("averages expense over the days elapsed in the current month", () => {
    expect(summarizeMonth(txs, "2026-09", "2026-09-10").summary.dailyAvgExpense).toBe(150_000);
  });

  it("averages over the whole month for past months and returns 0 for future months", () => {
    expect(summarizeMonth(txs, "2026-09", "2026-10-05").summary.dailyAvgExpense).toBe(50_000);
    expect(summarizeMonth([], "2026-11", "2026-10-05").summary.dailyAvgExpense).toBe(0);
  });

  it("groups expense by category, largest first, ignoring income", () => {
    expect(summarizeMonth(txs, "2026-09", "2026-09-10").expenseByCategory).toEqual([
      { category: "bills", amount: 1_000_000 },
      { category: "food", amount: 500_000 },
    ]);
  });

  it("returns one entry per day of the month", () => {
    const { daily } = summarizeMonth(txs, "2026-09", "2026-09-10");
    expect(daily).toHaveLength(30);
    expect(daily[0]).toEqual({ date: "2026-09-01", income: 10_000_000, expense: 300_000 });
    expect(daily[9]).toEqual({ date: "2026-09-10", income: 0, expense: 1_200_000 });
  });
});

describe("transactionSchema", () => {
  const valid = { type: "expense", amount: 25_000, category: "food", date: "2026-09-25" };

  it("accepts a valid transaction", () => {
    expect(transactionSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a category from the other type", () => {
    const r = transactionSchema.safeParse({ ...valid, category: "salary" });
    expect(r.success).toBe(false);
    expect(r.error?.flatten().fieldErrors.category).toEqual(["invalidCategory"]);
  });

  it("rejects non-positive amounts and impossible dates", () => {
    const r = transactionSchema.safeParse({ ...valid, amount: 0, date: "2026-02-30" });
    expect(r.error?.flatten().fieldErrors).toMatchObject({ amount: ["positive"], date: ["invalidDate"] });
  });
});

describe("budgetSchema", () => {
  it("only allows expense categories", () => {
    expect(budgetSchema.safeParse({ category: "food", amount: 1, month: "2026-09" }).success).toBe(true);
    expect(budgetSchema.safeParse({ category: "salary", amount: 1, month: "2026-09" }).success).toBe(false);
  });
});

describe("savingsDepositSchema", () => {
  it("allows withdrawals but not zero", () => {
    expect(savingsDepositSchema.safeParse({ deposit: -5000 }).success).toBe(true);
    expect(savingsDepositSchema.safeParse({ deposit: 0 }).success).toBe(false);
  });
});
