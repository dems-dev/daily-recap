import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { readJson, serverError, unauthorized, validationError, badRequest } from "@/lib/api";
import { dateKeyToDate, dateToKey, isMonthKey, monthKeyOf, monthRange, todayKey } from "@/lib/date";
import { transactionSchema } from "@/lib/finance";
import { summarizeMonth } from "@/lib/finance-summary";

/** Transactions and summary for one month: GET /api/finance?month=YYYY-MM */
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const today = todayKey(user.timezone);
    const month = new URL(req.url).searchParams.get("month") ?? monthKeyOf(today);
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

    return NextResponse.json({
      month,
      today,
      currency: user.currency,
      transactions,
      ...summarizeMonth(transactions, month, today),
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
