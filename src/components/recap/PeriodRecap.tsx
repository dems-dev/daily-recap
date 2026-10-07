"use client";

import { useLocale, useTranslations } from "next-intl";
import { ArrowDownRight, ArrowUpRight, Lightbulb, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDateFormat } from "@/components/common";
import { useCategoryLabel, useMoney } from "@/components/finance/shared";
import { DailyExpenseChart } from "@/components/finance/FinanceCharts";
import type { DayRow } from "@/lib/insights";
import { percentChange } from "@/lib/insights";
import type { Highlight, PeriodStats } from "@/lib/recap";
import { MoodFace } from "@/components/ui/mood-face";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/sleep";
import { AiSummary } from "./AiSummary";
import { WeeklyPriorities } from "@/components/plans/WeeklyPriorities";
import { WeeklyCoach } from "@/components/ai/WeeklyCoach";
import { addDays } from "@/lib/date";

export type PeriodRecapData = {
  period: "week" | "month";
  date: string;
  today: string;
  currency: string;
  start: string;
  end: string;
  current: PeriodStats;
  previous: PeriodStats;
  topCategories: { category: string; amount: number }[];
  daily: DayRow[];
  highlights: Highlight[];
};

function Delta({ value, suffix, invert = false }: { value: number | null; suffix: string; invert?: boolean }) {
  const t = useTranslations("Recap");
  if (value === null) return <span className="text-muted-foreground">{t("noComparison")}</span>;
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Minus className="size-3.5" aria-hidden /> {t("same")}
      </span>
    );
  }
  const up = value > 0;
  // For spending, going down is the good direction.
  const good = invert ? !up : up;
  return (
    <span className="inline-flex items-center gap-1 text-muted-foreground">
      {up ? (
        <ArrowUpRight className={cn("size-3.5", good ? "text-viz-good" : "text-viz-critical")} aria-hidden />
      ) : (
        <ArrowDownRight className={cn("size-3.5", good ? "text-viz-good" : "text-viz-critical")} aria-hidden />
      )}
      <span className="font-medium text-foreground">
        {up ? "+" : "−"}
        {Math.abs(value)}
        {suffix}
      </span>
      {t("vsPrevious")}
    </span>
  );
}

function Stat({ label, value, delta }: { label: string; value: React.ReactNode; delta: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tabular-nums">{value}</p>
        <p className="mt-1 text-xs tabular-nums">{delta}</p>
      </CardContent>
    </Card>
  );
}

export function PeriodRecap({ data }: { data: PeriodRecapData | null }) {
  const t = useTranslations("Recap");
  const money = useMoney(data?.currency);
  const categoryLabel = useCategoryLabel();
  const formatDate = useDateFormat();
  const locale = useLocale();

  if (!data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  const { current, previous } = data;
  if (data.start > data.today) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{t("futurePeriod")}</p>;
  }

  const perDay = (s: PeriodStats) => (s.days ? s.expense / s.days : 0);
  const expenseChange = percentChange(perDay(current), perDay(previous));
  const habitPoints =
    current.habitRate !== null && previous.habitRate !== null
      ? Math.round((current.habitRate - previous.habitRate) * 100)
      : null;
  const moodDelta =
    current.moodAvg !== null && previous.moodAvg !== null
      ? Math.round((current.moodAvg - previous.moodAvg) * 10) / 10
      : null;

  const highlightText = (h: Highlight) => {
    const p = h.params;
    switch (h.key) {
      case "topCategory":
        return t("highlights.topCategory", {
          category: categoryLabel(String(p.category)),
          amount: money(Number(p.amount)),
          pct: p.pct,
        });
      case "moodAvg":
        return t("highlights.moodAvg", p);
      case "sleepAvg":
      case "sleepUp":
      case "sleepDown":
        return t(`highlights.${h.key}`, {
          ...p,
          duration: formatDuration(Number(p.minutes), locale),
          diff: "diff" in p ? formatDuration(Number(p.diff), locale) : "",
        });
      default:
        return t(`highlights.${h.key}`, p);
    }
  };

  const topTotal = data.topCategories.reduce((a, c) => a + c.amount, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="size-4" aria-hidden /> {t(data.period === "week" ? "weekHighlights" : "monthHighlights")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.highlights.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("notEnoughData")}</p>
          ) : (
            <ul className="list-disc space-y-1.5 pl-5 text-sm">
              {data.highlights.map((h) => (
                <li key={h.key}>{highlightText(h)}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t("spent")} value={money(current.expense)} delta={<Delta value={expenseChange} suffix="%" invert />} />
        <Stat
          label={t("tasksDone")}
          value={current.todosDone}
          delta={<Delta value={previous.todosDone || current.todosDone ? current.todosDone - previous.todosDone : null} suffix="" />}
        />
        <Stat
          label={t("habitRate")}
          value={current.habitRate === null ? "-" : `${Math.round(current.habitRate * 100)}%`}
          delta={<Delta value={habitPoints} suffix=" pp" />}
        />
        <Stat
          label={t("moodAvg")}
          value={
            current.moodAvg === null ? (
              "-"
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <MoodFace score={current.moodAvg} size={18} /> {current.moodAvg.toFixed(1)}
              </span>
            )
          }
          delta={<Delta value={moodDelta} suffix="" />}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>{t("dayByDay")}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.period === "week" ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground">
                      <th className="py-2 font-medium">{t("col.day")}</th>
                      <th className="py-2 font-medium">{t("col.mood")}</th>
                      <th className="py-2 text-right font-medium">{t("col.habits")}</th>
                      <th className="py-2 text-right font-medium">{t("col.tasks")}</th>
                      <th className="py-2 text-right font-medium">{t("col.spent")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y tabular-nums">
                    {data.daily.map((d) => (
                      <tr key={d.date}>
                        <td className="py-2">{formatDate(d.date, "EEE, d MMM")}</td>
                        <td className="py-2">{d.mood !== null ? <MoodFace score={d.mood} size={20} /> : "-"}</td>
                        <td className="py-2 text-right">{d.habitsTotal ? `${d.habitsDone}/${d.habitsTotal}` : "-"}</td>
                        <td className="py-2 text-right">{d.todosDone}</td>
                        <td className="py-2 text-right">{money(d.expense)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="space-y-4">
                <DailyExpenseChart data={data.daily} money={money} />
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">{t("moodByDay")}</p>
                  <div className="flex flex-wrap gap-1">
                    {data.daily.map((d) => (
                      <span
                        key={d.date}
                        title={`${formatDate(d.date, "d MMM")}${d.mood ? "" : ` - ${t("noEntry")}`}`}
                        className="flex size-7 items-center justify-center rounded-md bg-muted/60 text-sm"
                      >
                        {d.mood !== null ? <MoodFace score={d.mood} size={18} /> : <span className="text-[10px] text-muted-foreground">{Number(d.date.slice(8))}</span>}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {data.period === "week" && <WeeklyCoach date={data.start} />}
          {data.period === "week" && <WeeklyPriorities date={data.start} title={t("weekPriorities")} />}
          {data.period === "week" && data.start <= data.today && data.today <= data.end && (
            <WeeklyPriorities date={addDays(data.end, 1)} title={t("planNextWeek")} emptyHint={t("planNextWeekHint")} />
          )}
          <Card>
            <CardHeader>
              <CardTitle>{t("topCategories")}</CardTitle>
            </CardHeader>
            <CardContent>
              {data.topCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noTransactions")}</p>
              ) : (
                <ul className="space-y-3">
                  {data.topCategories.map((c) => (
                    <li key={c.category} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{categoryLabel(c.category)}</span>
                        <span className="tabular-nums text-muted-foreground">{money(c.amount)}</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                        <div className="h-full rounded-full bg-viz-1" style={{ width: `${(c.amount / topTotal) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <AiSummary period={data.period} date={data.date} />
        </div>
      </div>
    </div>
  );
}
