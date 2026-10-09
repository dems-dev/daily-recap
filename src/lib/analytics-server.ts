import "server-only";
import { addDays, type DateKey } from "@/lib/date";
import { analyticsSeries, type AnalyticsRange } from "@/lib/analytics";
import { computeInsights } from "@/lib/insights";
import { loadDayRows } from "@/lib/recap-server";
import type { CurrentUser } from "@/lib/session";

/**
 * Insights and chart series for the last `days` days.
 * Shared by the analytics page (server-rendered) and GET /api/analytics, so
 * both produce identical payloads. The maths stays in `insights.ts` and
 * `analytics.ts` - this only gathers the rows.
 */
export async function buildAnalytics(user: CurrentUser, days: AnalyticsRange, today: DateKey) {
  const rows = await loadDayRows(user, addDays(today, -(days - 1)), today);

  const loggedDays = rows.filter(
    (r) => r.mood !== null || r.expense > 0 || r.habitsDone > 0 || r.todosDone > 0
  ).length;

  return {
    days,
    today,
    currency: user.currency,
    loggedDays,
    insights: computeInsights(rows),
    ...analyticsSeries(rows),
  };
}

export type AnalyticsData = Awaited<ReturnType<typeof buildAnalytics>>;
