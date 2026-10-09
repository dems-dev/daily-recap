import type { DayRow } from "@/lib/insights";

export const ANALYTICS_RANGES = [30, 90, 180] as const;
export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export function isAnalyticsRange(days: number): days is AnalyticsRange {
  return (ANALYTICS_RANGES as readonly number[]).includes(days);
}

/** Falls back to the middle range, so a junk ?days= never breaks the page. */
export function parseRange(raw: string | undefined): AnalyticsRange {
  const days = Number(raw);
  return isAnalyticsRange(days) ? days : 90;
}

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

  // Average mood after short / ok / good / long nights.
  const buckets = [
    { key: "lt6", min: 0, max: 360 },
    { key: "6to7", min: 360, max: 420 },
    { key: "7to8", min: 420, max: 480 },
    { key: "gte8", min: 480, max: Infinity },
  ];
  const moodBySleep = buckets.map((b) => {
    const days = rows.filter((r) => r.mood !== null && r.sleepMinutes !== null && r.sleepMinutes >= b.min && r.sleepMinutes < b.max);
    return { bucket: b.key, days: days.length, avgMood: mean(days.map((d) => d.mood!)) };
  });

  // Spending per calendar month present in the rows.
  const byMonth = new Map<string, number>();
  for (const r of rows) byMonth.set(r.date.slice(0, 7), (byMonth.get(r.date.slice(0, 7)) ?? 0) + r.expense);
  const monthlyExpense = [...byMonth.entries()].map(([month, expense]) => ({ month, expense }));

  return { expenseByMood, habitByWeekday, moodTrend, moodBySleep, monthlyExpense };
}
