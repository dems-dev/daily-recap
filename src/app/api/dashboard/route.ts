import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { serverError, unauthorized } from "@/lib/api";
import { todayKey } from "@/lib/date";
import { buildDashboard } from "@/lib/dashboard-server";
import { materializeRecurring } from "@/lib/recurring-server";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    await materializeRecurring(user.id, todayKey(user.timezone));

    return NextResponse.json(await buildDashboard(user));
  } catch (error) {
    return serverError(error);
  }
}
