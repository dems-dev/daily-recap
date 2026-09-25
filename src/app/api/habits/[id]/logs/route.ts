import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { badRequest, notFound, readJson, serverError, unauthorized, validationError } from "@/lib/api";
import { dateKeyToDate, todayKey } from "@/lib/date";
import { habitLogSchema } from "@/lib/habits";

/** Mark a day done/not done: PUT { date: "YYYY-MM-DD", completed: boolean } */
export async function PUT(req: Request, ctx: RouteContext<"/api/habits/[id]/logs">) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { id } = await ctx.params;

    const parsed = habitLogSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);
    const { date, completed } = parsed.data;
    if (date > todayKey(user.timezone)) return badRequest("Cannot log a future day");

    const habit = await prisma.habit.findFirst({ where: { id, userId: user.id }, select: { id: true } });
    if (!habit) return notFound();

    const day = dateKeyToDate(date);
    if (completed) {
      await prisma.habitLog.upsert({
        where: { habitId_date: { habitId: id, date: day } },
        update: { completed: true },
        create: { habitId: id, date: day, completed: true },
      });
    } else {
      await prisma.habitLog.deleteMany({ where: { habitId: id, date: day } });
    }

    return NextResponse.json({ id, date, completed });
  } catch (error) {
    return serverError(error);
  }
}
