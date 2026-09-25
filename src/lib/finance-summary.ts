import { daysInMonth, monthDateKeys, monthKeyOf, type DateKey, type MonthKey } from "@/lib/date";

export type SummaryTransaction = {
  type: string; // "income" | "expense"
  amount: number;
  category: string;
  date: DateKey;
};

/**
 * Totals, per-category expense and per-day series for one month.
 * `today` decides how many days the daily average is spread over.
 */
export function summarizeMonth(transactions: SummaryTransaction[], month: MonthKey, today: DateKey) {
  let income = 0;
  let expense = 0;
  const byCategory = new Map<string, number>();
  const daily = new Map(monthDateKeys(month).map((d) => [d, { date: d, income: 0, expense: 0 }]));

  for (const t of transactions) {
    const day = daily.get(t.date);
    if (t.type === "income") {
      income += t.amount;
      if (day) day.income += t.amount;
    } else {
      expense += t.amount;
      if (day) day.expense += t.amount;
      byCategory.set(t.category, (byCategory.get(t.category) ?? 0) + t.amount);
    }
  }

  // Average over the days that have happened: all of a past month, up to today for this month.
  const currentMonth = monthKeyOf(today);
  const elapsedDays =
    month < currentMonth ? daysInMonth(month) : month === currentMonth ? Number(today.slice(8, 10)) : 0;

  return {
    summary: {
      income,
      expense,
      balance: income - expense,
      dailyAvgExpense: elapsedDays > 0 ? expense / elapsedDays : 0,
    },
    expenseByCategory: [...byCategory.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount),
    daily: [...daily.values()],
  };
}
