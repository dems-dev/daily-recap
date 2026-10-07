"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Lightbulb } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, useDateFormat } from "@/components/common";
import { useMoney } from "@/components/finance/shared";
import { MoodAxisTick } from "@/components/ui/mood-face";
import { useJson } from "@/hooks/use-json";
import { formatCompact } from "@/lib/format";
import type { Insight } from "@/lib/insights";

type AnalyticsData = {
  days: number;
  today: string;
  currency: string;
  loggedDays: number;
  insights: Insight[];
  expenseByMood: { mood: number; days: number; avgExpense: number | null }[];
  habitByWeekday: { weekday: number; rate: number | null }[];
  moodTrend: { date: string; mood: number | null; avg7: number | null }[];
  moodBySleep: { bucket: "lt6" | "6to7" | "7to8" | "gte8"; days: number; avgMood: number | null }[];
  monthlyExpense: { month: string; expense: number }[];
};

const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 12 };
// A known week (Sun 6 – Sat 12 Sep 2026) to get localized weekday names.
const weekdayKey = (weekday: number) => `2026-09-${String(6 + weekday).padStart(2, "0")}`;

function TooltipBox({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10">
      <div className="text-muted-foreground">{title}</div>
      <div className="mt-0.5 font-medium tabular-nums">{value}</div>
    </div>
  );
}

function ChartCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default function AnalyticsPage() {
  const t = useTranslations("Analytics");
  const tj = useTranslations("Journal");
  const locale = useLocale();
  const formatDate = useDateFormat();
  const [days, setDays] = useState(90);
  const { data } = useJson<AnalyticsData>(`/api/analytics?days=${days}`);
  const money = useMoney(data?.currency);

  const insightText = (i: Insight) => {
    const p = i.params;
    switch (i.key) {
      case "spendMoreOnBadDays":
      case "spendLessOnBadDays":
        return t(`insights.${i.key}`, { pct: p.pct, bad: money(Number(p.badAvg)), good: money(Number(p.goodAvg)) });
      case "mostProductiveDay":
      case "biggestSpendingDay":
        return t(`insights.${i.key}`, {
          ...p,
          weekday: formatDate(weekdayKey(Number(p.weekday)), "EEEE"),
          avg: i.key === "biggestSpendingDay" ? money(Number(p.avg)) : p.avg,
        });
      default:
        return t(`insights.${i.key}`, p);
    }
  };

  const moodLabel = (score: number) => tj(`moods.${["terrible", "bad", "okay", "good", "great"][score - 1]}`);

  return (
    <div className="space-y-6">
      <PageHeader title={t("pageTitle")}>
        <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <TabsList>
            {[30, 90, 180].map((d) => (
              <TabsTrigger key={d} value={String(d)}>
                {t("lastDays", { days: d })}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </PageHeader>

      {!data || data.days !== days ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-40 lg:col-span-2" />
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="size-4" aria-hidden /> {t("insightsTitle")}
              </CardTitle>
              <p className="text-sm text-muted-foreground">{t("insightsBasis", { logged: data.loggedDays, days: data.days })}</p>
            </CardHeader>
            <CardContent>
              {data.insights.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noInsights")}</p>
              ) : (
                <ul className="space-y-3">
                  {data.insights.map((i) => (
                    <li key={i.key} className="rounded-lg border p-3 text-sm leading-relaxed">
                      {insightText(i)}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-2">
            <ChartCard title={t("moodTrend")} description={t("moodTrendDesc")}>
              {data.moodTrend.some((m) => m.avg7 !== null) ? (
                <div className="h-56" aria-label={t("moodTrend")} role="img">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.moodTrend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                      <CartesianGrid vertical={false} stroke="var(--border)" />
                      <XAxis
                        dataKey="date"
                        tick={AXIS_TICK}
                        tickLine={false}
                        axisLine={{ stroke: "var(--border)" }}
                        minTickGap={32}
                        tickFormatter={(d: string) => formatDate(d, "d MMM")}
                      />
                      <YAxis
                        domain={[1, 5]}
                        ticks={[1, 2, 3, 4, 5]}
                        width={28}
                        tick={<MoodAxisTick orientation="y" />}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip
                        cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
                        content={({ active, payload }) =>
                          active && payload?.[0]?.payload.avg7 != null ? (
                            <TooltipBox
                              title={formatDate(payload[0].payload.date, "EEEE, d MMM")}
                              value={t("avgMoodValue", { value: payload[0].payload.avg7.toFixed(1) })}
                            />
                          ) : null
                        }
                      />
                      <Line type="monotone" dataKey="avg7" stroke="var(--viz-1)" strokeWidth={2} dot={false} connectNulls={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">{t("notEnoughMood")}</p>
              )}
            </ChartCard>

            <ChartCard title={t("expenseByMood")} description={t("expenseByMoodDesc")}>
              {data.expenseByMood.some((m) => m.days > 0) ? (
                <div className="h-56" role="img" aria-label={t("expenseByMood")}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.expenseByMood} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
                      <CartesianGrid vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="mood" tick={<MoodAxisTick orientation="x" />} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
                      <YAxis width={48} tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatCompact(v, locale)} />
                      <Tooltip
                        cursor={{ fill: "var(--muted)", opacity: 0.6 }}
                        content={({ active, payload }) =>
                          active && payload?.[0] ? (
                            <TooltipBox
                              title={`${moodLabel(payload[0].payload.mood)} · ${t("dayCount", { count: payload[0].payload.days })}`}
                              value={payload[0].payload.avgExpense === null ? "-" : money(payload[0].payload.avgExpense)}
                            />
                          ) : null
                        }
                      />
                      <Bar dataKey="avgExpense" fill="var(--viz-1)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">{t("notEnoughMood")}</p>
              )}
            </ChartCard>

            <ChartCard title={t("moodBySleep")} description={t("moodBySleepDesc")}>
              {data.moodBySleep.some((b) => b.days > 0) ? (
                <div className="h-56" role="img" aria-label={t("moodBySleep")}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.moodBySleep} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
                      <CartesianGrid vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="bucket" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: "var(--border)" }} tickFormatter={(b: string) => t(`sleepBuckets.${b}`)} />
                      <YAxis domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} width={28} tick={<MoodAxisTick orientation="y" />} tickLine={false} axisLine={false} />
                      <Tooltip
                        cursor={{ fill: "var(--muted)", opacity: 0.6 }}
                        content={({ active, payload }) =>
                          active && payload?.[0] ? (
                            <TooltipBox
                              title={`${t(`sleepBuckets.${payload[0].payload.bucket}`)} · ${t("dayCount", { count: payload[0].payload.days })}`}
                              value={payload[0].payload.avgMood === null ? "-" : t("moodValue", { value: payload[0].payload.avgMood.toFixed(1) })}
                            />
                          ) : null
                        }
                      />
                      <Bar dataKey="avgMood" fill="var(--viz-1)" radius={[4, 4, 0, 0]} maxBarSize={48} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">{t("noSleepData")}</p>
              )}
            </ChartCard>

            <ChartCard title={t("habitsByWeekday")} description={t("habitsByWeekdayDesc")}>
              {data.habitByWeekday.some((d) => d.rate !== null) ? (
                <div className="h-56" role="img" aria-label={t("habitsByWeekday")}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.habitByWeekday} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
                      <CartesianGrid vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="weekday" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: "var(--border)" }} tickFormatter={(v: number) => formatDate(weekdayKey(v), "EEE")} />
                      <YAxis domain={[0, 1]} width={40} tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${Math.round(v * 100)}%`} />
                      <Tooltip
                        cursor={{ fill: "var(--muted)", opacity: 0.6 }}
                        content={({ active, payload }) =>
                          active && payload?.[0] ? (
                            <TooltipBox
                              title={formatDate(weekdayKey(payload[0].payload.weekday), "EEEE")}
                              value={payload[0].payload.rate === null ? "-" : `${Math.round(payload[0].payload.rate * 100)}%`}
                            />
                          ) : null
                        }
                      />
                      <Bar dataKey="rate" fill="var(--viz-1)" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">{t("noHabitData")}</p>
              )}
            </ChartCard>

            <ChartCard title={t("monthlyExpense")}>
              {data.monthlyExpense.some((m) => m.expense > 0) ? (
                <div className="h-56" role="img" aria-label={t("monthlyExpense")}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.monthlyExpense} margin={{ top: 8, right: 0, bottom: 0, left: 0 }}>
                      <CartesianGrid vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="month" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: "var(--border)" }} tickFormatter={(m: string) => formatDate(`${m}-01`, "MMM")} />
                      <YAxis width={48} tick={AXIS_TICK} tickLine={false} axisLine={false} tickFormatter={(v: number) => formatCompact(v, locale)} />
                      <Tooltip
                        cursor={{ fill: "var(--muted)", opacity: 0.6 }}
                        content={({ active, payload }) =>
                          active && payload?.[0] ? (
                            <TooltipBox title={formatDate(`${payload[0].payload.month}-01`, "MMMM yyyy")} value={money(payload[0].payload.expense)} />
                          ) : null
                        }
                      />
                      <Bar dataKey="expense" fill="var(--viz-1)" radius={[4, 4, 0, 0]} maxBarSize={48} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-10 text-center text-sm text-muted-foreground">{t("noExpenseData")}</p>
              )}
            </ChartCard>
          </div>
          <p className="text-xs text-muted-foreground">{t("partialMonthNote")}</p>
        </>
      )}
    </div>
  );
}
