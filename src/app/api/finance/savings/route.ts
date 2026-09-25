import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { readJson, serverError, unauthorized, validationError } from "@/lib/api";
import { dateKeyToDate, dateToKey, todayKey } from "@/lib/date";
import { savingsGoalSchema } from "@/lib/finance";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const goals = await prisma.savingsGoal.findMany({
      where: { userId: user.id },
      orderBy: [{ isCompleted: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({
      today: todayKey(user.timezone),
      currency: user.currency,
      goals: goals.map((g) => ({
        id: g.id,
        name: g.name,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        deadline: g.deadline ? dateToKey(g.deadline) : null,
        isCompleted: g.isCompleted,
      })),
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const parsed = savingsGoalSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);

    const { name, targetAmount, deadline } = parsed.data;
    const goal = await prisma.savingsGoal.create({
      data: {
        userId: user.id,
        name,
        targetAmount,
        deadline: deadline ? dateKeyToDate(deadline) : null,
      },
    });

    return NextResponse.json({ id: goal.id }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
