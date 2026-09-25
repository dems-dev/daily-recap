import { addDays, dateKeyToDate, monthRange, monthKeyOf, dateToKey, type DateKey } from "@/lib/date";
import { percentChange, type DayRow } from "@/lib/insights";

export const PERIODS = ["day", "week", "month"] as const;
export type Period = (typeof PERIODS)[number];

/** Inclusive [start, end] date keys of the week or month containing `date`. */
export function periodRange(period: Exclude<Period, "day">, date: DateKey, weekStartDay: string) {
  if (period === "week") {
    const startDow = weekStartDay === "sunday" ? 0 : 1;
    const dow = dateKeyToDate(date).getUTCDay();
    const start = addDays(date, -((dow - startDow + 7) % 7));
    return { start, end: addDays(start, 6) };
  }
  const { start, end } = monthRange(monthKeyOf(date));
  return { start: dateToKey(start), end: addDays(dateToKey(end), -1) };
}

/** The same-length period right before. */
export function previousRange(period: Exclude<Period, "day">, start: DateKey, weekStartDay: string) {
  return periodRange(period, addDays(start, -1), weekStartDay);
}

export type PeriodStats = {
  days: number;
  expense: number;
  income: number;
  todosDone: number;
  habitRate: number | null; // 0–1 over days with active habits
  moodAvg: number | null; // 1–5
  moodDays: number;
  sleepAvg: number | null; // minutes
  sleepNights: number;
};

export function periodStats(rows: DayRow[], income: number): PeriodStats {
  const habitDays = rows.filter((r) => r.habitsTotal > 0);
  const moods = rows.map((r) => r.mood).filter((m): m is number => m !== null);
  const habitSlots = habitDays.reduce((a, r) => a + r.habitsTotal, 0);
  const sleeps = rows.map((r) => r.sleepMinutes).filter((m): m is number => m !== null);
  return {
    days: rows.length,
    expense: rows.reduce((a, r) => a + r.expense, 0),
    income,
    todosDone: rows.reduce((a, r) => a + r.todosDone, 0),
    habitRate: habitSlots ? habitDays.reduce((a, r) => a + r.habitsDone, 0) / habitSlots : null,
    moodAvg: moods.length ? moods.reduce((a, b) => a + b, 0) / moods.length : null,
    moodDays: moods.length,
    sleepAvg: sleeps.length ? Math.round(sleeps.reduce((a, b) => a + b, 0) / sleeps.length) : null,
    sleepNights: sleeps.length,
  };
}

export type Highlight = { key: string; params: Record<string, string | number> };

/**
 * Short, factual sentences comparing a period with the one before.
 * Only changes big enough to matter are mentioned.
 */
export function periodHighlights(
  current: PeriodStats,
  previous: PeriodStats,
  topCategory: { category: string; amount: number } | null,
  priorities: { done: number; total: number } | null = null
): Highlight[] {
  const out: Highlight[] = [];

  if (priorities && priorities.total > 0) {
    out.push({
      key: priorities.done === priorities.total ? "prioritiesAllDone" : "prioritiesDone",
      params: { done: priorities.done, total: priorities.total },
    });
  }

  // Compare spending per day so a half-finished month isn't "down 50%".
  const perDay = (s: PeriodStats) => (s.days ? s.expense / s.days : 0);
  const change = percentChange(perDay(current), perDay(previous));
  if (change !== null && Math.abs(change) >= 10) {
    out.push({ key: change < 0 ? "expenseDown" : "expenseUp", params: { pct: Math.abs(change) } });
  }

  if (topCategory && current.expense > 0) {
    out.push({
      key: "topCategory",
      params: {
        category: topCategory.category,
        amount: topCategory.amount,
        pct: Math.round((topCategory.amount / current.expense) * 100),
      },
    });
  }

  if (current.habitRate !== null) {
    const points =
      previous.habitRate !== null ? Math.round((current.habitRate - previous.habitRate) * 100) : null;
    if (points !== null && Math.abs(points) >= 10) {
      out.push({ key: points > 0 ? "habitsUp" : "habitsDown", params: { points: Math.abs(points) } });
    } else {
      out.push({ key: "habitsRate", params: { pct: Math.round(current.habitRate * 100) } });
    }
  }

  if (current.todosDone > 0) {
    out.push({ key: "todosDone", params: { count: current.todosDone, prev: previous.todosDone } });
  }

  if (current.sleepAvg !== null) {
    const diff = previous.sleepAvg !== null ? current.sleepAvg - previous.sleepAvg : 0;
    out.push(
      Math.abs(diff) >= 20
        ? { key: diff > 0 ? "sleepUp" : "sleepDown", params: { minutes: current.sleepAvg, diff: Math.abs(diff) } }
        : { key: "sleepAvg", params: { minutes: current.sleepAvg, nights: current.sleepNights } }
    );
  }

  if (current.moodAvg !== null) {
    out.push({
      key: "moodAvg",
      params: { avg: Math.round(current.moodAvg * 10) / 10, days: current.moodDays, total: current.days },
    });
  } else if (current.days >= 3) {
    out.push({ key: "noMood", params: {} });
  }

  return out;
}
