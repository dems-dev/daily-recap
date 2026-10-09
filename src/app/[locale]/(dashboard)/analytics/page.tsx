import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common";
import { ChartsSection, ChartsSkeleton } from "@/components/analytics/ChartsSection";
import { InsightsCard } from "@/components/analytics/InsightsCard";
import { RangeTabs } from "@/components/analytics/RangeTabs";
import { parseRange, type AnalyticsRange } from "@/lib/analytics";
import { buildAnalytics } from "@/lib/analytics-server";
import { todayKey } from "@/lib/date";
import { materializeRecurring } from "@/lib/recurring-server";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "@/i18n/routing";

/**
 * Rendered on the server: the data is gathered in the same region as the
 * database instead of in a second round trip from the browser. The header and
 * range tabs are the static shell, the insights stream in next, and the charts
 * load their bundle last - so each part appears as soon as it is ready.
 */
export default async function AnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ days?: string }>;
}) {
  const [{ locale }, { days: raw }, t] = await Promise.all([
    params,
    searchParams,
    getTranslations("Analytics"),
  ]);
  const days = parseRange(raw);

  return (
    <div className="space-y-6">
      <PageHeader title={t("pageTitle")}>
        <RangeTabs days={days} />
      </PageHeader>

      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsContent days={days} locale={locale} />
      </Suspense>
    </div>
  );
}

async function AnalyticsContent({ days, locale }: { days: AnalyticsRange; locale: string }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: "/login", locale });
    return null;
  }

  const today = todayKey(user.timezone);
  await materializeRecurring(user.id, today);
  const data = await buildAnalytics(user, days, today);

  return (
    <>
      <InsightsCard
        insights={data.insights}
        loggedDays={data.loggedDays}
        days={data.days}
        currency={data.currency}
      />
      {/* Only the series cross into the chart bundle; the insight rows stay out of it. */}
      <ChartsSection
        data={{
          currency: data.currency,
          expenseByMood: data.expenseByMood,
          habitByWeekday: data.habitByWeekday,
          moodTrend: data.moodTrend,
          moodBySleep: data.moodBySleep,
          monthlyExpense: data.monthlyExpense,
        }}
      />
    </>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-40" />
      <ChartsSkeleton />
    </div>
  );
}
