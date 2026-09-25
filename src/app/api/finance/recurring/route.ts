import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { readJson, serverError, unauthorized, validationError } from "@/lib/api";
import { dateKeyToDate, dateToKey, todayKey } from "@/lib/date";
import { recurringSchema } from "@/lib/recurring";
import { materializeRecurring } from "@/lib/recurring-server";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const today = todayKey(user.timezone);
    await materializeRecurring(user.id, today);

    const rules = await prisma.recurringTransaction.findMany({
      where: { userId: user.id },
      orderBy: [{ isActive: "desc" }, { nextDate: "asc" }],
      include: { _count: { select: { finances: true } } },
    });

    return NextResponse.json({
      today,
      currency: user.currency,
      rules: rules.map((r) => ({
        id: r.id,
        type: r.type,
        amount: r.amount,
        category: r.category,
        description: r.description,
        frequency: r.frequency,
        anchorDate: dateToKey(r.anchorDate),
        nextDate: dateToKey(r.nextDate),
        isActive: r.isActive,
        generated: r._count.finances,
      })),
    });
  } catch (error) {
    return serverError(error);
  }
}

/** Create a rule; occurrences up to today are generated right away. */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const parsed = recurringSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);
    const { startDate, description, ...data } = parsed.data;

    const rule = await prisma.recurringTransaction.create({
      data: {
        ...data,
        description: description || null,
        userId: user.id,
        anchorDate: dateKeyToDate(startDate),
        nextDate: dateKeyToDate(startDate),
      },
    });
    const generated = await materializeRecurring(user.id, todayKey(user.timezone));

    return NextResponse.json({ id: rule.id, generated }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
