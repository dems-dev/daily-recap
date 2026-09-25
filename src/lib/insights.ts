/**
 * Cross-module insights from per-day rows. Pure: the API gathers the rows,
 * this decides what's worth saying. Every rule needs enough days on both
 * sides of a comparison and a meaningful gap, so we never "discover"
 * a pattern in three data points.
 */

export type DayRow = {
  date: string; // YYYY-MM-DD
  weekday: number; // 0 = Sunday … 6 = Saturday
  expense: number;
  mood: number | null; // 1–5, null when no journal
  habitsDone: number;
  habitsTotal: number; // active habits that day
  todosDone: number;
};

export type Insight = {
  key:
    | "spendMoreOnBadDays"
    | "spendLessOnBadDays"
    | "betterMoodWithHabits"
    | "mostProductiveDay"
    | "biggestSpendingDay"
    | "weekendMood"
    | "journalConsistency";
  params: Record<string, string | number>;
  /** 0–1, used to order insights. */
  strength: number;
};

export const MIN_GROUP_DAYS = 4;

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const round1 = (x: number) => Math.round(x * 10) / 10;

function spendingVsMood(rows: DayRow[]): Insight | null {
  const withMood = rows.filter((r) => r.mood !== null);
  const bad = withMood.filter((r) => r.mood! <= 2).map((r) => r.expense);
  const good = withMood.filter((r) => r.mood! >= 4).map((r) => r.expense);
  if (bad.length < MIN_GROUP_DAYS || good.length < MIN_GROUP_DAYS) return null;
  const badAvg = mean(bad);
  const goodAvg = mean(good);
  if (goodAvg === 0 && badAvg === 0) return null;
  const base = Math.min(badAvg, goodAvg);
  const pct = base === 0 ? 100 : Math.round((Math.abs(badAvg - goodAvg) / base) * 100);
  if (pct < 20) return null;
  return {
    key: badAvg > goodAvg ? "spendMoreOnBadDays" : "spendLessOnBadDays",
    params: { pct, badAvg: Math.round(badAvg), goodAvg: Math.round(goodAvg) },
    strength: Math.min(1, pct / 100),
  };
}

function habitsVsMood(rows: DayRow[]): Insight | null {
  const eligible = rows.filter((r) => r.mood !== null && r.habitsTotal > 0);
  const high = eligible.filter((r) => r.habitsDone / r.habitsTotal >= 0.75).map((r) => r.mood!);
  const low = eligible.filter((r) => r.habitsDone / r.habitsTotal < 0.5).map((r) => r.mood!);
  if (high.length < MIN_GROUP_DAYS || low.length < MIN_GROUP_DAYS) return null;
  const delta = mean(high) - mean(low);
  if (delta < 0.5) return null;
  return {
    key: "betterMoodWithHabits",
    params: { delta: round1(delta), high: round1(mean(high)), low: round1(mean(low)) },
    strength: Math.min(1, delta / 2),
  };
}

/** Weekday with the highest average of `pick`, if it clearly stands out. */
function standoutWeekday(rows: DayRow[], pick: (r: DayRow) => number, minWeeks = 3) {
  const byDay = new Map<number, number[]>();
  for (const r of rows) byDay.set(r.weekday, [...(byDay.get(r.weekday) ?? []), pick(r)]);
  const avgs = [...byDay.entries()].filter(([, xs]) => xs.length >= minWeeks).map(([day, xs]) => ({ day, avg: mean(xs) }));
  if (avgs.length < 5) return null;
  const overall = mean(avgs.map((a) => a.avg));
  const best = avgs.reduce((a, b) => (b.avg > a.avg ? b : a));
  if (overall === 0 || best.avg < overall * 1.3) return null;
  return { weekday: best.day, ratio: best.avg / overall, avg: best.avg };
}

function productiveDay(rows: DayRow[]): Insight | null {
  const s = standoutWeekday(rows, (r) => r.todosDone);
  if (!s) return null;
  return {
    key: "mostProductiveDay",
    params: { weekday: s.weekday, avg: round1(s.avg) },
    strength: Math.min(1, (s.ratio - 1) / 1.5),
  };
}

function spendingDay(rows: DayRow[]): Insight | null {
  const s = standoutWeekday(rows, (r) => r.expense);
  if (!s) return null;
  return {
    key: "biggestSpendingDay",
    params: { weekday: s.weekday, pct: Math.round((s.ratio - 1) * 100), avg: Math.round(s.avg) },
    strength: Math.min(1, (s.ratio - 1) / 2),
  };
}

function weekendMood(rows: DayRow[]): Insight | null {
  const withMood = rows.filter((r) => r.mood !== null);
  const weekend = withMood.filter((r) => r.weekday === 0 || r.weekday === 6).map((r) => r.mood!);
  const weekday = withMood.filter((r) => r.weekday !== 0 && r.weekday !== 6).map((r) => r.mood!);
  if (weekend.length < MIN_GROUP_DAYS || weekday.length < MIN_GROUP_DAYS) return null;
  const delta = mean(weekend) - mean(weekday);
  if (Math.abs(delta) < 0.4) return null;
  return {
    key: "weekendMood",
    params: { direction: delta > 0 ? "higher" : "lower", delta: round1(Math.abs(delta)) },
    strength: Math.min(1, Math.abs(delta) / 2) * 0.8,
  };
}

function journalConsistency(rows: DayRow[]): Insight | null {
  const last30 = rows.slice(-30);
  if (last30.length < 14) return null;
  const logged = last30.filter((r) => r.mood !== null).length;
  return {
    key: "journalConsistency",
    params: { logged, days: last30.length },
    strength: 0.2, // always shown last: a nudge, not a finding
  };
}

export function computeInsights(rows: DayRow[]): Insight[] {
  return [spendingVsMood, habitsVsMood, productiveDay, spendingDay, weekendMood, journalConsistency]
    .map((rule) => rule(rows))
    .filter((i): i is Insight => i !== null)
    .sort((a, b) => b.strength - a.strength);
}

/** Percent change from `previous` to `current`; null when there's no baseline. */
export function percentChange(current: number, previous: number) {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}
