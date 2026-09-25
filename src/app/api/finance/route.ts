import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { readJson, serverError, unauthorized, validationError, badRequest } from "@/lib/api";
import {
  dateKeyToDate,
  dateToKey,
  daysInMonth,
  isMonthKey,
  monthDateKeys,
  monthKeyOf,
  monthRange,
  todayKey,
} from "@/lib/date";
import { transactionSchema } from "@/lib/finance";

/** Transactions and summary for one month: GET /api/finance?month=YYYY-MM */
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const today = todayKey(user.timezone);
    const currentMonth = monthKeyOf(today);
    const month = new URL(req.url).searchParams.get("month") ?? currentMonth;
    if (!isMonthKey(month)) return badRequest("Invalid month");

    const range = monthRange(month);
    const rows = await prisma.finance.findMany({
      where: { userId: user.id, date: { gte: range.start, lt: range.end } },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    });

    const transactions = rows.map((f) => ({
      id: f.id,
      type: f.type,
      amount: f.amount,
      category: f.category,
      description: f.description,
      date: dateToKey(f.date),
    }));

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
    const elapsedDays =
      month < currentMonth ? daysInMonth(month) : month === currentMonth ? Number(today.slice(8, 10)) : 0;

    return NextResponse.json({
      month,
      today,
      currency: user.currency,
      transactions,
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
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const parsed = transactionSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);

    const { date, description, ...data } = parsed.data;
    const created = await prisma.finance.create({
      data: {
        ...data,
        description: description || null,
        date: dateKeyToDate(date),
        userId: user.id,
      },
    });

    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
