import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { readJson, serverError, unauthorized, validationError } from "@/lib/api";
import { addDays, dateKeyToDate, todayKey } from "@/lib/date";
import { pomodoroSchema, serializePomodoro } from "@/lib/pomodoro";

/** GET /api/pomodoro - today's sessions plus weekly stats. */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const today = todayKey(user.timezone);
    const todayDate = dateKeyToDate(today);
    const weekAgo = dateKeyToDate(addDays(today, -6));

    const [todaySessions, weekSessions] = await Promise.all([
      prisma.pomodoroSession.findMany({
        where: { userId: user.id, date: todayDate, isCompleted: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.pomodoroSession.findMany({
        where: {
          userId: user.id,
          isCompleted: true,
          date: { gte: weekAgo, lte: todayDate },
        },
      }),
    ]);

    const byCategory = new Map<string, number>();
    for (const s of weekSessions) {
      byCategory.set(s.category, (byCategory.get(s.category) ?? 0) + s.duration);
    }

    const todayMinutes = todaySessions.reduce((a, s) => a + s.duration, 0);
    const weekMinutes = weekSessions.reduce((a, s) => a + s.duration, 0);

    return NextResponse.json({
      today,
      sessions: todaySessions.map(serializePomodoro),
      stats: {
        today: { sessions: todaySessions.length, minutes: todayMinutes },
        week: { sessions: weekSessions.length, minutes: weekMinutes },
        byCategory: [...byCategory.entries()]
          .map(([category, minutes]) => ({ category, minutes }))
          .sort((a, b) => b.minutes - a.minutes),
      },
    });
  } catch (error) {
    return serverError(error);
  }
}

/** POST /api/pomodoro - save a completed session. */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const parsed = pomodoroSchema.safeParse(await readJson(req));
    if (!parsed.success) return validationError(parsed.error);

    const { category, label, duration, date } = parsed.data;
    const session = await prisma.pomodoroSession.create({
      data: {
        userId: user.id,
        category,
        label: label ?? null,
        duration,
        isCompleted: true,
        date: dateKeyToDate(date),
      },
    });

    return NextResponse.json({ id: session.id }, { status: 201 });
  } catch (error) {
    return serverError(error);
  }
}
