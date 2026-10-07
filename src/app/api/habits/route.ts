import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { readJson, serverError, unauthorized, validationError } from "@/lib/api";
import { addDays, dateKeyInTz, dateToKey, todayKey } from "@/lib/date";
import { bestStreak, completionRate, currentStreak, habitSchema } from "@/lib/habits";

const GRID_DAYS = 7;

/** GET /api/habits?archived=1 - habits with the last 7 days, streaks and 30-day rate. */
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const archived = new URL(req.url).searchParams.get("archived") === "1";
    const today = todayKey(user.timezone);
    const days = Array.from({ length: GRID_DAYS }, (_, i) => addDays(today, i - (GRID_DAYS - 1)));

    const habits = await prisma.habit.findMany({
      where: { userId: user.id, isActive: !archived },
      orderBy: { createdAt: "asc" },
      include: { logs: { where: { completed: true }, select: { date: true } } },
    });

    return NextResponse.json({
      today,
      days,
      habits: habits.map((h) => {
        const done = new Set(h.logs.map((l) => dateToKey(l.date)));
        const createdOn = dateKeyInTz(h.createdAt, user.timezone);
        return {
          id: h.id,
          name: h.name,
          icon: h.icon,
          isActive: h.isActive,
          days: Object.fromEntries(days.map((d) => [d, done.has(d)])),
          currentStreak: currentStreak(done, today),
          bestStreak: bestStreak(done),
          rate30: completionRate(done, today, createdOn),
        };
      }),
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const parsed = habitSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);

    const habit = await prisma.habit.create({
      data: { userId: user.id, name: parsed.data.name, icon: parsed.data.icon || null },
    });
    return NextResponse.json({ id: habit.id }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
