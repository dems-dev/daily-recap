import prisma from "@/lib/prisma";
import {
  addDays,
  dateKeyInTz,
  dateKeyToDate,
  dateToKey,
  dayBoundsInTz,
  type DateKey,
} from "@/lib/date";
import type { DayRow } from "@/lib/insights";
import { isMood, MOOD_SCORE, serializeJournal } from "@/lib/journal";
import type { CurrentUser } from "@/lib/session";
import { compareTodos, serializeTodo } from "@/lib/todos";
import { periodHighlights, periodRange, periodStats, previousRange, type Period } from "@/lib/recap";
import { instantToLocalTime } from "@/lib/sleep";

/** Everything the recap page shows for a day, week or month. */
export async function buildRecap(user: CurrentUser, period: Period, date: DateKey, today: DateKey) {
  if (period === "day") return dayRecap(user, date, today);

  // weekStartDay rides along on CurrentUser, so no second User query here.
  const weekStart = user.weekStartDay;
  const range = periodRange(period, date, weekStart);
  const prev = previousRange(period, range.start, weekStart);
  // Only days that have happened count towards averages and rates.
  const elapsedEnd = range.end < today ? range.end : today;
  const prevElapsedEnd = prev.end < today ? prev.end : today;

  const hasElapsed = range.start <= today;
  const [rows, prevRows, income, prevIncome, categories, priorities] = await Promise.all([
    hasElapsed ? loadDayRows(user, range.start, elapsedEnd) : Promise.resolve([]),
    loadDayRows(user, prev.start, prevElapsedEnd),
    sumIncome(user.id, range.start, range.end),
    sumIncome(user.id, prev.start, prev.end),
    expenseByCategory(user.id, range.start, range.end),
    period === "week"
      ? prisma.weeklyPriority.findMany({
          where: { userId: user.id, weekStart: dateKeyToDate(range.start) },
          select: { isDone: true },
        })
      : Promise.resolve(null),
  ]);

  const current = periodStats(rows, income);
  const previous = periodStats(prevRows, prevIncome);

  return {
    period,
    date,
    today,
    currency: user.currency,
    start: range.start,
    end: range.end,
    current,
    previous,
    topCategories: categories.slice(0, 5),
    daily: rows,
    highlights: periodHighlights(
      current,
      previous,
      categories[0] ?? null,
      priorities ? { done: priorities.filter((p) => p.isDone).length, total: priorities.length } : null
    ),
  };
}

/** Per-day rows across modules for [start, end] (inclusive), in the user's timezone. */
export async function loadDayRows(user: CurrentUser, start: DateKey, end: DateKey): Promise<DayRow[]> {
  const from = dateKeyToDate(start);
  const to = dateKeyToDate(addDays(end, 1));
  const instants = { start: dayBoundsInTz(start, user.timezone).start, end: dayBoundsInTz(end, user.timezone).end };

  const [expenses, journals, habits, todos, sleeps] = await Promise.all([
    prisma.finance.groupBy({
      by: ["date"],
      where: { userId: user.id, type: "expense", date: { gte: from, lt: to } },
      _sum: { amount: true },
    }),
    prisma.journal.findMany({
      where: { userId: user.id, date: { gte: from, lt: to } },
      select: { date: true, mood: true },
    }),
    prisma.habit.findMany({
      where: { userId: user.id, isActive: true },
      select: {
        createdAt: true,
        logs: { where: { completed: true, date: { gte: from, lt: to } }, select: { date: true } },
      },
    }),
    prisma.todo.findMany({
      where: { userId: user.id, isCompleted: true, completedAt: { gte: instants.start, lt: instants.end } },
      select: { completedAt: true },
    }),
    prisma.sleepLog.findMany({
      where: { userId: user.id, date: { gte: from, lt: to } },
      select: { date: true, duration: true },
    }),
  ]);
  const sleepBy = new Map(sleeps.map((s) => [dateToKey(s.date), s.duration]));

  const expenseBy = new Map(expenses.map((e) => [dateToKey(e.date), e._sum.amount ?? 0]));
  const moodBy = new Map(
    journals.filter((j) => isMood(j.mood)).map((j) => [dateToKey(j.date), MOOD_SCORE[j.mood as keyof typeof MOOD_SCORE]])
  );
  const habitsDoneBy = new Map<string, number>();
  for (const h of habits) for (const l of h.logs) {
    const key = dateToKey(l.date);
    habitsDoneBy.set(key, (habitsDoneBy.get(key) ?? 0) + 1);
  }
  const habitStarts = habits.map((h) => dateKeyInTz(h.createdAt, user.timezone));
  const todosBy = new Map<string, number>();
  for (const t of todos) {
    const key = dateKeyInTz(t.completedAt!, user.timezone);
    todosBy.set(key, (todosBy.get(key) ?? 0) + 1);
  }

  const rows: DayRow[] = [];
  for (let day = start; day <= end; day = addDays(day, 1)) {
    const done = habitsDoneBy.get(day) ?? 0;
    // Habits count from the day they were created; a logged day always counts.
    const total = Math.max(done, habitStarts.filter((s) => s <= day).length);
    rows.push({
      date: day,
      weekday: dateKeyToDate(day).getUTCDay(),
      expense: expenseBy.get(day) ?? 0,
      mood: moodBy.get(day) ?? null,
      habitsDone: done,
      habitsTotal: total,
      todosDone: todosBy.get(day) ?? 0,
      sleepMinutes: sleepBy.get(day) ?? null,
    });
  }
  return rows;
}

export async function sumIncome(userId: string, start: DateKey, end: DateKey) {
  const r = await prisma.finance.aggregate({
    where: { userId, type: "income", date: { gte: dateKeyToDate(start), lt: dateKeyToDate(addDays(end, 1)) } },
    _sum: { amount: true },
  });
  return r._sum.amount ?? 0;
}

export async function expenseByCategory(userId: string, start: DateKey, end: DateKey) {
  const rows = await prisma.finance.groupBy({
    by: ["category"],
    where: { userId, type: "expense", date: { gte: dateKeyToDate(start), lt: dateKeyToDate(addDays(end, 1)) } },
    _sum: { amount: true },
  });
  return rows
    .map((r) => ({ category: r.category, amount: r._sum.amount ?? 0 }))
    .sort((a, b) => b.amount - a.amount);
}

async function dayRecap(user: CurrentUser, date: DateKey, today: DateKey) {
  const day = dateKeyToDate(date);
  const bounds = dayBoundsInTz(date, user.timezone);

  const [finances, completedTodos, openTodos, habits, journal, sleep] = await Promise.all([
    prisma.finance.findMany({ where: { userId: user.id, date: day }, orderBy: { createdAt: "asc" } }),
    prisma.todo.findMany({
      where: { userId: user.id, isCompleted: true, completedAt: { gte: bounds.start, lt: bounds.end } },
    }),
    // Still open and due that day (or, for today, overdue too).
    prisma.todo.findMany({
      where: {
        userId: user.id,
        isCompleted: false,
        dueDate: date === today ? { lte: day } : day,
      },
    }),
    prisma.habit.findMany({
      where: { userId: user.id, isActive: true },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true, icon: true, createdAt: true, logs: { where: { date: day, completed: true }, select: { id: true } } },
    }),
    prisma.journal.findUnique({ where: { userId_date: { userId: user.id, date: day } } }),
    prisma.sleepLog.findUnique({ where: { userId_date: { userId: user.id, date: day } } }),
  ]);

  const income = finances.filter((f) => f.type === "income").reduce((a, f) => a + f.amount, 0);
  const expense = finances.filter((f) => f.type === "expense").reduce((a, f) => a + f.amount, 0);

  return {
    period: "day" as const,
    date,
    today,
    currency: user.currency,
    finance: {
      income,
      expense,
      transactions: finances.map((f) => ({
        id: f.id,
        type: f.type,
        amount: f.amount,
        category: f.category,
        description: f.description,
      })),
    },
    todos: {
      completed: completedTodos.map(serializeTodo),
      open: openTodos.map(serializeTodo).sort(compareTodos),
    },
    habits: habits
      // Habits created after this day didn't exist yet.
      .filter((h) => dateKeyInTz(h.createdAt, user.timezone) <= date || h.logs.length > 0)
      .map((h) => ({ id: h.id, name: h.name, icon: h.icon, done: h.logs.length > 0 })),
    journal: journal ? serializeJournal(journal) : null,
    sleep: sleep
      ? {
          date,
          bedtime: instantToLocalTime(sleep.bedtime, user.timezone),
          wakeTime: instantToLocalTime(sleep.wakeTime, user.timezone),
          duration: sleep.duration,
          quality: sleep.quality,
          notes: sleep.notes,
        }
      : null,
  };
}

export type RecapResult = Awaited<ReturnType<typeof buildRecap>>;
