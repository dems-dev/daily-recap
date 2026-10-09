import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { badRequest, serverError, unauthorized } from "@/lib/api";
import { todayKey } from "@/lib/date";
import { isAnalyticsRange } from "@/lib/analytics";
import { buildAnalytics } from "@/lib/analytics-server";
import { materializeRecurring } from "@/lib/recurring-server";

/** GET /api/analytics?days=30|90|180 - cross-module insights and chart series. */
export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const days = Number(new URL(req.url).searchParams.get("days") ?? 90);
    if (!isAnalyticsRange(days)) return badRequest("Invalid range");

    const today = todayKey(user.timezone);
    await materializeRecurring(user.id, today);

    return NextResponse.json(await buildAnalytics(user, days, today));
  } catch (error) {
    return serverError(error);
  }
}
