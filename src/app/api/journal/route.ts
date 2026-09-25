import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { badRequest, serverError, unauthorized } from "@/lib/api";
import { isMonthKey, monthKeyOf, monthRange, todayKey } from "@/lib/date";
import { serializeJournal } from "@/lib/journal";

/** Entries of one month for the calendar: GET /api/journal?month=YYYY-MM */
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const today = todayKey(user.timezone);
    const month = new URL(req.url).searchParams.get("month") ?? monthKeyOf(today);
    if (!isMonthKey(month)) return badRequest("Invalid month");

    const range = monthRange(month);
    const rows = await prisma.journal.findMany({
      where: { userId: user.id, date: { gte: range.start, lt: range.end } },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({
      month,
      today,
      entries: rows.map((row) => {
        const { content, ...rest } = serializeJournal(row);
        return { ...rest, excerpt: content.slice(0, 160) };
      }),
    });
  } catch (error) {
    return serverError(error);
  }
}
