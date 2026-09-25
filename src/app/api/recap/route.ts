import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { badRequest, serverError, unauthorized } from "@/lib/api";
import { isDateKey, todayKey } from "@/lib/date";
import { PERIODS, type Period } from "@/lib/recap";
import { buildRecap } from "@/lib/recap-server";
import { materializeRecurring } from "@/lib/recurring-server";

/** GET /api/recap?period=day|week|month&date=YYYY-MM-DD */
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const params = new URL(req.url).searchParams;
    const today = todayKey(user.timezone);
    const period = (params.get("period") ?? "day") as Period;
    const date = params.get("date") ?? today;
    if (!PERIODS.includes(period)) return badRequest("Invalid period");
    if (!isDateKey(date)) return badRequest("Invalid date");

    await materializeRecurring(user.id, today);
    return NextResponse.json(await buildRecap(user, period, date, today));
  } catch (error) {
    return serverError(error);
  }
}
