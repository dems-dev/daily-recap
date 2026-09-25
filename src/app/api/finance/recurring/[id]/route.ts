import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { badRequest, notFound, readJson, serverError, unauthorized, validationError } from "@/lib/api";
import { dateKeyToDate, dateToKey, todayKey } from "@/lib/date";
import { nextOccurrence, recurringPatchSchema, type Frequency } from "@/lib/recurring";
import { categoriesFor, type TransactionType } from "@/lib/finance";

/**
 * Edit a rule: { amount?, category?, description? } for future occurrences, and/or
 * pause/resume with { isActive }. Resuming skips the dates missed while paused.
 */
export async function PATCH(req: Request, ctx: RouteContext<"/api/finance/recurring/[id]">) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await ctx.params;

    const parsed = recurringPatchSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);

    const rule = await prisma.recurringTransaction.findFirst({ where: { id, userId: user.id } });
    if (!rule) return notFound();

    const { isActive, amount, category, description } = parsed.data;
    if (category !== undefined && !categoriesFor(rule.type as TransactionType).includes(category)) {
      return badRequest("Invalid category");
    }

    let nextDate = rule.nextDate;
    if (isActive && !rule.isActive) {
      const today = todayKey(user.timezone);
      let cursor = dateToKey(rule.nextDate);
      while (cursor < today) cursor = nextOccurrence(dateToKey(rule.anchorDate), cursor, rule.frequency as Frequency);
      nextDate = dateKeyToDate(cursor);
    }

    await prisma.recurringTransaction.update({
      where: { id },
      data: {
        nextDate,
        ...(isActive !== undefined && { isActive }),
        ...(amount !== undefined && { amount }),
        ...(category !== undefined && { category }),
        ...(description !== undefined && { description: description || null }),
      },
    });
    return NextResponse.json({ id });
  } catch (error) {
    return serverError(error);
  }
}

/** Delete the rule. Transactions it already created are kept. */
export async function DELETE(_req: Request, ctx: RouteContext<"/api/finance/recurring/[id]">) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await ctx.params;

    const { count } = await prisma.recurringTransaction.deleteMany({ where: { id, userId: user.id } });
    if (count === 0) return notFound();
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return serverError(error);
  }
}
