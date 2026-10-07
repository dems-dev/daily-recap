import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { badRequest, serverError, unauthorized } from "@/lib/api";
import { addDays, dateKeyToDate, dateToKey, todayKey } from "@/lib/date";
import { averageBedtime, bedtimeSpread, instantToLocalTime } from "@/lib/sleep";

const RANGES = [14, 30, 90] as const;

/** GET /api/sleep?days=14|30|90 - nights in the range plus averages. */
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const days = Number(new URL(req.url).searchParams.get("days") ?? 14);
    if (!(RANGES as readonly number[]).includes(days)) return badRequest("Invalid range");

    const today = todayKey(user.timezone);
    const start = addDays(today, -(days - 1));
    const rows = await prisma.sleepLog.findMany({
      where: { userId: user.id, date: { gte: dateKeyToDate(start), lte: dateKeyToDate(today) } },
      orderBy: { date: "asc" },
    });

    const logs = rows.map((r) => ({
      date: dateToKey(r.date),
      bedtime: instantToLocalTime(r.bedtime, user.timezone),
      wakeTime: instantToLocalTime(r.wakeTime, user.timezone),
      duration: r.duration,
      quality: r.quality,
      notes: r.notes,
    }));
    const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

    return NextResponse.json({
      days,
      today,
      start,
      logs,
      stats: {
        nights: logs.length,
        avgDuration: mean(logs.map((l) => l.duration)),
        avgQuality: mean(logs.map((l) => l.quality)),
        avgBedtime: averageBedtime(logs.map((l) => l.bedtime)),
        bedtimeSpread: bedtimeSpread(logs.map((l) => l.bedtime)),
        shortNights: logs.filter((l) => l.duration < 6 * 60).length,
      },
    });
  } catch (error) {
    return serverError(error);
  }
}
