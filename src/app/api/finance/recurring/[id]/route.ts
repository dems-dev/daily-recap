import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { notFound, readJson, serverError, unauthorized, validationError } from "@/lib/api";
import { dateKeyToDate, dateToKey, todayKey } from "@/lib/date";
import { nextOccurrence, type Frequency } from "@/lib/recurring";

/** Pause or resume a rule: PATCH { isActive }. Resuming skips the dates missed while paused. */
export async function PATCH(req: Request, ctx: RouteContext<"/api/finance/recurring/[id]">) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await ctx.params;

    const parsed = z.object({ isActive: z.boolean() }).safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);

    const rule = await prisma.recurringTransaction.findFirst({ where: { id, userId: user.id } });
    if (!rule) return notFound();

    let nextDate = rule.nextDate;
    if (parsed.data.isActive && !rule.isActive) {
      const today = todayKey(user.timezone);
      let cursor = dateToKey(rule.nextDate);
      while (cursor < today) cursor = nextOccurrence(dateToKey(rule.anchorDate), cursor, rule.frequency as Frequency);
      nextDate = dateKeyToDate(cursor);
    }

    await prisma.recurringTransaction.update({
      where: { id },
      data: { isActive: parsed.data.isActive, nextDate },
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
