import "server-only";
import prisma from "@/lib/prisma";
import {
  addDays,
  dateKeyInTz,
  dateKeyToDate,
  dateToKey,
  dayBoundsInTz,
  monthKeyOf,
  monthRange,
  todayKey,
} from "@/lib/date";
import { compareTodos, serializeTodo, todayTodosWhere } from "@/lib/todos";
import { isMood } from "@/lib/journal";
import type { CurrentUser } from "@/lib/session";

const MOOD_SCORE: Record<string, number> = { terrible: 1, bad: 2, okay: 3, good: 4, great: 5 };

/** Kinds of entry shown in the "recent activity" list. */
export type ActivityType = "income" | "expense" | "journal" | "todo" | "habit";
type ActivityRow = { id: string; type: ActivityType; title: string; amount?: number; at: Date };

/**
 * Everything the dashboard shows. Shared by the dashboard page (server-rendered)
 * and GET /api/dashboard, so both produce identical payloads.
 * Call materializeRecurring before this - it is a write and stays out of here.
 */
export async function buildDashboard(user: CurrentUser) {
  const userId = user.id;
  const tz = user.timezone;
  const today = todayKey(tz);
  const todayDate = dateKeyToDate(today);
  const month = monthRange(monthKeyOf(today));
  const todayBounds = dayBoundsInTz(today, tz);

  // Trends (last 7 days) + streak share one window. 180 days lets long streaks
  // show correctly while staying cheap for a single user (date-only selects).
  const windowStartKey = addDays(today, -179);
  const windowStartDate = dateKeyToDate(windowStartKey);
  const windowTodoStart = dayBoundsInTz(windowStartKey, tz).start;
  const weekKeys = Array.from({ length: 7 }, (_, i) => addDays(today, -6 + i)); // old → new

  const [
    finances,
    journal,
    todos,
    habits,
    recentFinances,
    recentJournals,
    recentTodos,
    recentHabitLogs,
    sleep,
    pomodoroToday,
    winFinance,
    winHabitLogs,
    winTodos,
    winJournals,
    winSleep,
    winPomodoro,
  ] = await Promise.all([
    prisma.finance.findMany({
      where: { userId, date: { gte: month.start, lt: month.end } },
      select: { type: true, amount: true, date: true },
    }),
    prisma.journal.findUnique({ where: { userId_date: { userId, date: todayDate } } }),
    prisma.todo.findMany({ where: todayTodosWhere(userId, todayDate, todayBounds) }),
    prisma.habit.findMany({
      where: { userId, isActive: true },
      select: { id: true, logs: { where: { date: todayDate, completed: true }, select: { id: true } } },
    }),
    prisma.finance.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, type: true, category: true, description: true, amount: true, createdAt: true },
    }),
    prisma.journal.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
      take: 3,
      select: { id: true, title: true, mood: true, updatedAt: true },
    }),
    prisma.todo.findMany({
      where: { userId, isCompleted: true, completedAt: { not: null } },
      orderBy: { completedAt: "desc" },
      take: 5,
      select: { id: true, title: true, completedAt: true },
    }),
    prisma.habitLog.findMany({
      where: { habit: { userId }, completed: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, updatedAt: true, habit: { select: { name: true } } },
    }),
    prisma.sleepLog.findUnique({
      where: { userId_date: { userId, date: todayDate } },
      select: { duration: true, quality: true },
    }),
    prisma.pomodoroSession.aggregate({
      where: { userId, isCompleted: true, date: todayDate },
      _sum: { duration: true },
    }),
    // 60-day windows (trends + streak)
    prisma.finance.findMany({
      where: { userId, date: { gte: windowStartDate } },
      select: { type: true, amount: true, date: true },
    }),
    prisma.habitLog.findMany({
      where: { habit: { userId }, completed: true, date: { gte: windowStartDate } },
      select: { date: true },
    }),
    prisma.todo.findMany({
      where: { userId, isCompleted: true, completedAt: { gte: windowTodoStart } },
      select: { completedAt: true },
    }),
    prisma.journal.findMany({
      where: { userId, date: { gte: windowStartDate } },
      select: { date: true, mood: true },
    }),
    prisma.sleepLog.findMany({
      where: { userId, date: { gte: windowStartDate } },
      select: { date: true, duration: true },
    }),
    prisma.pomodoroSession.findMany({
      where: { userId, isCompleted: true, date: { gte: windowStartDate } },
      select: { date: true, duration: true },
    }),
  ]);

  const sum = (type: string, onlyToday = false) =>
    finances
      .filter((f) => f.type === type && (!onlyToday || f.date.getTime() === todayDate.getTime()))
      .reduce((acc, f) => acc + f.amount, 0);
  const income = sum("income");
  const expense = sum("expense");

  const recentRows: ActivityRow[] = [
    ...recentFinances.map((f): ActivityRow => ({
      id: `finance-${f.id}`,
      type: f.type === "income" ? "income" : "expense",
      title: f.description || f.category,
      amount: f.amount,
      at: f.createdAt,
    })),
    ...recentJournals.map((j): ActivityRow => ({ id: `journal-${j.id}`, type: "journal", title: j.title ?? "", at: j.updatedAt })),
    ...recentTodos.map((t): ActivityRow => ({ id: `todo-${t.id}`, type: "todo", title: t.title, at: t.completedAt! })),
    ...recentHabitLogs.map((l): ActivityRow => ({ id: `habit-${l.id}`, type: "habit", title: l.habit.name, at: l.updatedAt })),
  ];
  const recentActivities = recentRows
    .sort((a, b) => b.at.getTime() - a.at.getTime())
    .slice(0, 6)
    .map((a) => ({ ...a, at: a.at.toISOString() }));

  const todayTodos = todos.map(serializeTodo).sort(compareTodos);
  const habitsTotal = habits.length;

  // --- Per-day buckets over the window ---
  const expenseByDay = new Map<string, number>();
  const financeActive = new Set<string>();
  for (const f of winFinance) {
    const k = dateToKey(f.date);
    financeActive.add(k);
    if (f.type === "expense") expenseByDay.set(k, (expenseByDay.get(k) ?? 0) + f.amount);
  }
  const habitCountByDay = new Map<string, number>();
  for (const h of winHabitLogs) {
    const k = dateToKey(h.date);
    habitCountByDay.set(k, (habitCountByDay.get(k) ?? 0) + 1);
  }
  const taskByDay = new Map<string, number>();
  for (const t of winTodos) {
    if (!t.completedAt) continue;
    const k = dateKeyInTz(t.completedAt, tz);
    taskByDay.set(k, (taskByDay.get(k) ?? 0) + 1);
  }
  const moodByDay = new Map<string, number>();
  for (const j of winJournals) {
    moodByDay.set(dateToKey(j.date), MOOD_SCORE[j.mood] ?? 0);
  }
  const sleepByDay = new Map<string, number>();
  for (const s of winSleep) sleepByDay.set(dateToKey(s.date), s.duration);
  const focusByDay = new Map<string, number>();
  for (const p of winPomodoro) {
    const k = dateToKey(p.date);
    focusByDay.set(k, (focusByDay.get(k) ?? 0) + p.duration);
  }

  // Active-day set for the streak (any tracked signal counts).
  const activeDays = new Set<string>([
    ...financeActive,
    ...habitCountByDay.keys(),
    ...taskByDay.keys(),
    ...moodByDay.keys(),
    ...sleepByDay.keys(),
    ...focusByDay.keys(),
  ]);
  let streak = 0;
  let cursor = activeDays.has(today) ? today : addDays(today, -1);
  while (activeDays.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }

  const week = weekKeys.map((k) => {
    const habitCount = habitCountByDay.get(k) ?? 0;
    const tasks = taskByDay.get(k) ?? 0;
    const mood = moodByDay.get(k) ?? 0;
    const sleepMin = sleepByDay.get(k) ?? 0;
    const focusMin = focusByDay.get(k) ?? 0;
    const signals = [habitCount > 0, tasks > 0, mood > 0, sleepMin > 0, focusMin > 0];
    const activity = Math.round((signals.filter(Boolean).length / signals.length) * 100);
    return {
      date: k,
      activity,
      expense: expenseByDay.get(k) ?? 0,
      habitsRatio: habitsTotal > 0 ? Math.min(1, habitCount / habitsTotal) : 0,
      tasks,
      mood,
      sleepMin,
      focusMin,
    };
  });

  return {
    today,
    currency: user.currency,
    finance: { income, expense, balance: income - expense, expenseToday: sum("expense", true) },
    habits: { total: habitsTotal, doneToday: habits.filter((h) => h.logs.length > 0).length },
    mind: {
      mood: journal && isMood(journal.mood) ? journal.mood : null,
      hasReflection: !!journal?.content.trim(),
    },
    productivity: {
      todosTotal: todayTodos.length,
      todosCompleted: todayTodos.filter((t) => t.isCompleted).length,
    },
    sleep: sleep ? { duration: sleep.duration, quality: sleep.quality } : null,
    focus: { todayMinutes: pomodoroToday._sum.duration ?? 0 },
    streak,
    week,
    todayTodos: todayTodos.slice(0, 6),
    recentActivities,
  };
}

export type DashboardPayload = Awaited<ReturnType<typeof buildDashboard>>;
