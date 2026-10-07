import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { readJson, serverError, unauthorized, validationError } from "@/lib/api";
import { dateKeyToDate, todayKey } from "@/lib/date";
import { waterLogSchema } from "@/lib/water";

/** GET /api/water?date=YYYY-MM-DD - today's water log. */
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const today = todayKey(user.timezone);
    const dateParam = new URL(req.url).searchParams.get("date") ?? today;
    const date = dateKeyToDate(dateParam);

    const log = await prisma.waterLog.findUnique({
      where: { userId_date: { userId: user.id, date } },
    });

    return NextResponse.json({
      date: dateParam,
      glasses: log?.glasses ?? 0,
      target: log?.target ?? 8,
    });
  } catch (error) {
    return serverError(error);
  }
}

/** PUT /api/water - upsert water log for a date. */
export async function PUT(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const parsed = waterLogSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);

    const { date, glasses, target } = parsed.data;

    await prisma.waterLog.upsert({
      where: { userId_date: { userId: user.id, date: dateKeyToDate(date) } },
      create: {
        userId: user.id,
        date: dateKeyToDate(date),
        glasses,
        target: target ?? 8,
      },
      update: {
        glasses,
        ...(target !== undefined && { target }),
      },
    });

    return NextResponse.json({ date, glasses });
  } catch (error) {
    return serverError(error);
  }
}
