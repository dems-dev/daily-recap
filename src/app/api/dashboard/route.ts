import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { serverError, unauthorized } from "@/lib/api";
import { dateKeyToDate, dayBoundsInTz, monthKeyOf, monthRange, todayKey } from "@/lib/date";
import { compareTodos, serializeTodo, todayTodosWhere } from "@/lib/todos";
import { isMood } from "@/lib/journal";
import { materializeRecurring } from "@/lib/recurring-server";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const userId = user.id;
    const today = todayKey(user.timezone);
    const todayDate = dateKeyToDate(today);
    const month = monthRange(monthKeyOf(today));
    const todayBounds = dayBoundsInTz(today, user.timezone);
    await materializeRecurring(userId, today);

    const [finances, journal, todos, habits, recentFinances, recentJournals, recentTodos, recentHabitLogs] =
      await Promise.all([
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
      ]);

    const sum = (type: string, onlyToday = false) =>
      finances
        .filter((f) => f.type === type && (!onlyToday || f.date.getTime() === todayDate.getTime()))
        .reduce((acc, f) => acc + f.amount, 0);
    const income = sum("income");
    const expense = sum("expense");

    const recentActivities = [
      ...recentFinances.map((f) => ({
        id: `finance-${f.id}`,
        type: f.type === "income" ? "income" : "expense",
        title: f.description || f.category,
        amount: f.amount,
        at: f.createdAt,
      })),
      ...recentJournals.map((j) => ({ id: `journal-${j.id}`, type: "journal", title: j.title ?? "", at: j.updatedAt })),
      ...recentTodos.map((t) => ({ id: `todo-${t.id}`, type: "todo", title: t.title, at: t.completedAt! })),
      ...recentHabitLogs.map((l) => ({ id: `habit-${l.id}`, type: "habit", title: l.habit.name, at: l.updatedAt })),
    ]
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, 6)
      .map((a) => ({ ...a, at: a.at.toISOString() }));

    const todayTodos = todos.map(serializeTodo).sort(compareTodos);

    return NextResponse.json({
      today,
      currency: user.currency,
      finance: { income, expense, balance: income - expense, expenseToday: sum("expense", true) },
      habits: { total: habits.length, doneToday: habits.filter((h) => h.logs.length > 0).length },
      mind: {
        mood: journal && isMood(journal.mood) ? journal.mood : null,
        hasReflection: !!journal?.content.trim(),
      },
      productivity: {
        todosTotal: todayTodos.length,
        todosCompleted: todayTodos.filter((t) => t.isCompleted).length,
      },
      todayTodos: todayTodos.slice(0, 6),
      recentActivities,
    });
  } catch (error) {
    return serverError(error);
  }
}
