import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { badRequest, serverError, unauthorized } from "@/lib/api";
import { addDays, todayKey } from "@/lib/date";
import { computeInsights } from "@/lib/insights";
import { analyticsSeries } from "@/lib/analytics";
import { loadDayRows } from "@/lib/recap-server";
import { materializeRecurring } from "@/lib/recurring-server";

const RANGES = [30, 90, 180] as const;

/** GET /api/analytics?days=30|90|180 — cross-module insights and chart series. */
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const days = Number(new URL(req.url).searchParams.get("days") ?? 90);
    if (!(RANGES as readonly number[]).includes(days)) return badRequest("Invalid range");

    const today = todayKey(user.timezone);
    await materializeRecurring(user.id, today);
    const rows = await loadDayRows(user, addDays(today, -(days - 1)), today);

    const loggedDays = rows.filter((r) => r.mood !== null || r.expense > 0 || r.habitsDone > 0 || r.todosDone > 0).length;

    return NextResponse.json({
      days,
      today,
      currency: user.currency,
      loggedDays,
      insights: computeInsights(rows),
      ...analyticsSeries(rows),
    });
  } catch (error) {
    return serverError(error);
  }
}
