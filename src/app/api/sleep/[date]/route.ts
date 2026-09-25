import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { badRequest, notFound, readJson, serverError, unauthorized, validationError } from "@/lib/api";
import { dateKeyToDate, isDateKey, todayKey } from "@/lib/date";
import { MAX_SLEEP_MINUTES, MIN_SLEEP_MINUTES, sleepSchema, sleepWindow } from "@/lib/sleep";

/** Log (or replace) the night that ended on the morning of `date`. */
export async function PUT(req: Request, ctx: RouteContext<"/api/sleep/[date]">) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { date } = await ctx.params;

    const body = await readJson(req);
    const parsed = sleepSchema.safeParse({ ...(typeof body === "object" && body ? body : {}), date });
    if (!parsed.success) return validationError(parsed.error);
    if (date > todayKey(user.timezone)) return badRequest("Cannot log a future night");

    const { bedtime, wakeTime, duration } = sleepWindow(date, parsed.data.bedtime, parsed.data.wakeTime, user.timezone);
    if (duration < MIN_SLEEP_MINUTES || duration > MAX_SLEEP_MINUTES) {
      return NextResponse.json(
        { message: "Implausible sleep duration", errors: { wakeTime: ["implausibleDuration"] } },
        { status: 400 }
      );
    }

    const data = { bedtime, wakeTime, duration, quality: parsed.data.quality, notes: parsed.data.notes || null };
    const day = dateKeyToDate(date);
    await prisma.sleepLog.upsert({
      where: { userId_date: { userId: user.id, date: day } },
      update: data,
      create: { ...data, userId: user.id, date: day },
    });
    return NextResponse.json({ date, duration });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/sleep/[date]">) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();
    const { date } = await ctx.params;
    if (!isDateKey(date)) return badRequest("Invalid date");

    const { count } = await prisma.sleepLog.deleteMany({ where: { userId: user.id, date: dateKeyToDate(date) } });
    if (count === 0) return notFound();
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return serverError(error);
  }
}
