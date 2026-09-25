import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { serverError, unauthorized } from "@/lib/api";
import { dateKeyToDate, dayBoundsInTz, monthKeyOf, monthRange, todayKey } from "@/lib/date";
import { todayTodosWhere } from "@/lib/todos";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const userId = user.id;
    const today = todayKey(user.timezone);
    const todayDate = dateKeyToDate(today);
    const month = monthRange(monthKeyOf(today));
    const todayBounds = dayBoundsInTz(today, user.timezone);

    const [
      finances,
      workoutsCount,
      waterLog,
      sleepLog,
      journal,
      todos,
      recentFinances,
      recentWorkouts,
      recentMeals,
      recentJournals,
      recentTodos,
    ] = await Promise.all([
      prisma.finance.findMany({
        where: { userId, date: { gte: month.start, lt: month.end } },
        select: { type: true, amount: true },
      }),
      prisma.workout.count({ where: { userId, date: todayDate } }),
      prisma.waterLog.findUnique({ where: { userId_date: { userId, date: todayDate } } }),
      prisma.sleepLog.findUnique({ where: { userId_date: { userId, date: todayDate } } }),
      prisma.journal.findUnique({ where: { userId_date: { userId, date: todayDate } } }),
      prisma.todo.findMany({
        where: todayTodosWhere(userId, todayDate, todayBounds),
        select: { isCompleted: true },
      }),
      prisma.finance.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, type: true, category: true, description: true, amount: true, createdAt: true },
      }),
      prisma.workout.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, createdAt: true },
      }),
      prisma.meal.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, name: true, createdAt: true },
      }),
      prisma.journal.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, title: true, createdAt: true },
      }),
      prisma.todo.findMany({
        where: { userId, isCompleted: true, completedAt: { not: null } },
        orderBy: { completedAt: "desc" },
        take: 5,
        select: { id: true, title: true, completedAt: true },
      }),
    ]);

    const income = finances.filter((f) => f.type === "income").reduce((acc, f) => acc + f.amount, 0);
    const expense = finances.filter((f) => f.type === "expense").reduce((acc, f) => acc + f.amount, 0);

    const recentActivities = [
      ...recentFinances.map((f) => ({
        id: `finance-${f.id}`,
        type: f.type === "income" ? "income" : "expense",
        title: f.description || f.category,
        amount: f.amount,
        at: f.createdAt,
      })),
      ...recentWorkouts.map((w) => ({ id: `workout-${w.id}`, type: "workout", title: w.name, at: w.createdAt })),
      ...recentMeals.map((m) => ({ id: `meal-${m.id}`, type: "meal", title: m.name, at: m.createdAt })),
      ...recentJournals.map((j) => ({ id: `journal-${j.id}`, type: "journal", title: j.title ?? "", at: j.createdAt })),
      ...recentTodos.map((t) => ({ id: `todo-${t.id}`, type: "todo", title: t.title, at: t.completedAt! })),
    ]
      .sort((a, b) => b.at.getTime() - a.at.getTime())
      .slice(0, 6)
      .map((a) => ({ ...a, at: a.at.toISOString() }));

    return NextResponse.json({
      today,
      currency: user.currency,
      finance: {
        income,
        expense,
        balance: income - expense,
      },
      health: {
        workoutsCount,
        waterGlasses: waterLog?.glasses || 0,
        waterTarget: waterLog?.target || 8,
        sleepDuration: sleepLog?.duration || 0,
        sleepQuality: sleepLog?.quality || 0,
      },
      mind: {
        mood: journal?.mood || "none",
        gratitudeCount: journal?.gratitude ? JSON.parse(journal.gratitude).length : 0,
      },
      productivity: {
        todosTotal: todos.length,
        todosCompleted: todos.filter((t) => t.isCompleted).length,
      },
      recentActivities,
    });
  } catch (error) {
    return serverError(error);
  }
}
