import type { DayRow } from "@/lib/insights";

/** Aggregations for the analytics charts. Pure; see loadDayRows for the input. */
export function analyticsSeries(rows: DayRow[]) {
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

  // Average spending per mood score (only days with a journal entry).
  const expenseByMood = [1, 2, 3, 4, 5].map((score) => {
    const days = rows.filter((r) => r.mood === score);
    return { mood: score, days: days.length, avgExpense: mean(days.map((d) => d.expense)) };
  });

  // Habit completion share per weekday, Monday first.
  const habitByWeekday = [1, 2, 3, 4, 5, 6, 0].map((weekday) => {
    const days = rows.filter((r) => r.weekday === weekday && r.habitsTotal > 0);
    const total = days.reduce((a, r) => a + r.habitsTotal, 0);
    const done = days.reduce((a, r) => a + r.habitsDone, 0);
    return { weekday, rate: total ? done / total : null };
  });

  // 7-day rolling average of mood; null until at least 3 of the last 7 days have a mood.
  const moodTrend = rows.map((r, i) => {
    const window = rows.slice(Math.max(0, i - 6), i + 1).map((w) => w.mood).filter((m): m is number => m !== null);
    return { date: r.date, mood: r.mood, avg7: window.length >= 3 ? Math.round(mean(window)! * 100) / 100 : null };
  });

  // Spending per calendar month present in the rows.
  const byMonth = new Map<string, number>();
  for (const r of rows) byMonth.set(r.date.slice(0, 7), (byMonth.get(r.date.slice(0, 7)) ?? 0) + r.expense);
  const monthlyExpense = [...byMonth.entries()].map(([month, expense]) => ({ month, expense }));

  return { expenseByMood, habitByWeekday, moodTrend, monthlyExpense };
}
