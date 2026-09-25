import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { badRequest, notFound, readJson, serverError, unauthorized, validationError } from "@/lib/api";
import { dateKeyToDate } from "@/lib/date";
import { savingsDepositSchema, savingsGoalSchema } from "@/lib/finance";

/** Edit a goal ({ name, targetAmount, deadline }) or add money to it ({ deposit }). */
export async function PATCH(req: Request, ctx: RouteContext<"/api/finance/savings/[id]">) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await ctx.params;

    const goal = await prisma.savingsGoal.findFirst({ where: { id, userId: user.id } });
    if (!goal) return notFound();

    const body = await readJson(req);
    let targetAmount = goal.targetAmount;
    let currentAmount = goal.currentAmount;
    let edit: { name: string; deadline: Date | null } | undefined;

    if (body && typeof body === "object" && "deposit" in body) {
      const parsed = savingsDepositSchema.safeParse(body);
      if (!parsed.success) return validationError(parsed.error);
      currentAmount += parsed.data.deposit;
      if (currentAmount < 0) return badRequest("Withdrawal exceeds saved amount");
    } else {
      const parsed = savingsGoalSchema.safeParse(body);
      if (!parsed.success) return validationError(parsed.error);
      targetAmount = parsed.data.targetAmount;
      edit = {
        name: parsed.data.name,
        deadline: parsed.data.deadline ? dateKeyToDate(parsed.data.deadline) : null,
      };
    }

    await prisma.savingsGoal.update({
      where: { id },
      data: {
        ...edit,
        targetAmount,
        currentAmount,
        isCompleted: currentAmount >= targetAmount,
      },
    });

    return NextResponse.json({ id });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/finance/savings/[id]">) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await ctx.params;

    const { count } = await prisma.savingsGoal.deleteMany({ where: { id, userId: user.id } });
    if (count === 0) return notFound();

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return serverError(error);
  }
}
