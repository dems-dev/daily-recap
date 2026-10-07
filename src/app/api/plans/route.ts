import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { badRequest, readJson, serverError, unauthorized, validationError } from "@/lib/api";
import { addDays, dateKeyToDate, isDateKey, todayKey } from "@/lib/date";
import { periodRange } from "@/lib/recap";
import { MAX_PRIORITIES, priorityCreateSchema } from "@/lib/plans";

async function weekStartOf(userId: string, date: string) {
  const settings = await prisma.user.findUnique({ where: { id: userId }, select: { weekStartDay: true } });
  return periodRange("week", date, settings?.weekStartDay ?? "monday");
}

/** GET /api/plans?date=YYYY-MM-DD - priorities of the week containing `date` (default: this week). */
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const today = todayKey(user.timezone);
    const date = new URL(req.url).searchParams.get("date") ?? today;
    if (!isDateKey(date)) return badRequest("Invalid date");

    const week = await weekStartOf(user.id, date);
    const rows = await prisma.weeklyPriority.findMany({
      where: { userId: user.id, weekStart: dateKeyToDate(week.start) },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({
      today,
      weekStart: week.start,
      weekEnd: week.end,
      isCurrentWeek: week.start <= today && today <= week.end,
      nextWeekDate: addDays(week.end, 1),
      priorities: rows.map((p) => ({ id: p.id, title: p.title, isDone: p.isDone })),
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const parsed = priorityCreateSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);

    const week = await weekStartOf(user.id, parsed.data.date);
    const weekStart = dateKeyToDate(week.start);
    const count = await prisma.weeklyPriority.count({ where: { userId: user.id, weekStart } });
    if (count >= MAX_PRIORITIES) {
      return NextResponse.json({ message: "Too many priorities", code: "tooMany" }, { status: 400 });
    }

    const priority = await prisma.weeklyPriority.create({
      data: { userId: user.id, weekStart, title: parsed.data.title, order: count },
    });
    return NextResponse.json({ id: priority.id }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
