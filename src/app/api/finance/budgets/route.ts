import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { badRequest, readJson, serverError, unauthorized, validationError } from "@/lib/api";
import { isMonthKey, monthKeyOf, monthRange, parseMonthKey, todayKey } from "@/lib/date";
import { budgetSchema } from "@/lib/finance";

/** Budgets for a month with what has been spent: GET /api/finance/budgets?month=YYYY-MM */
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const month = new URL(req.url).searchParams.get("month") ?? monthKeyOf(todayKey(user.timezone));
    if (!isMonthKey(month)) return badRequest("Invalid month");

    const { year, month: monthNum } = parseMonthKey(month);
    const range = monthRange(month);

    const [budgets, spending] = await Promise.all([
      prisma.budget.findMany({
        where: { userId: user.id, year, month: monthNum },
        orderBy: { category: "asc" },
      }),
      prisma.finance.groupBy({
        by: ["category"],
        where: { userId: user.id, type: "expense", date: { gte: range.start, lt: range.end } },
        _sum: { amount: true },
      }),
    ]);

    const spentBy = new Map(spending.map((s) => [s.category, s._sum.amount ?? 0]));

    return NextResponse.json({
      month,
      currency: user.currency,
      budgets: budgets.map((b) => ({
        id: b.id,
        category: b.category,
        amount: b.amount,
        spent: spentBy.get(b.category) ?? 0,
      })),
    });
  } catch (error) {
    return serverError(error);
  }
}

/** Create or replace the budget for one category and month. */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const parsed = budgetSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);

    const { category, amount, month: monthKey } = parsed.data;
    const { year, month } = parseMonthKey(monthKey);

    const budget = await prisma.budget.upsert({
      where: { userId_category_month_year: { userId: user.id, category, month, year } },
      update: { amount },
      create: { userId: user.id, category, amount, month, year },
    });

    return NextResponse.json({ id: budget.id }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
