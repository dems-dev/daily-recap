"use client";

import { useTranslations } from "next-intl";
import { Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDateFormat } from "@/components/common";
import { useMoney } from "@/components/finance/shared";
import type { Insight } from "@/lib/insights";
import { weekdayKey } from "./shared";

/**
 * Cross-module insights. Text only, so it server-renders and paints with the
 * document - no need to wait for the chart bundle.
 */
export function InsightsCard({
  insights,
  loggedDays,
  days,
  currency,
}: {
  insights: Insight[];
  loggedDays: number;
  days: number;
  currency: string;
}) {
  const t = useTranslations("Analytics");
  const formatDate = useDateFormat();
  const money = useMoney(currency);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="size-4" aria-hidden /> {t("insightsTitle")}
        </CardTitle>
        <p className="text-sm text-muted-foreground">{t("insightsBasis", { logged: loggedDays, days })}</p>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noInsights")}</p>
        ) : (
          <ul className="space-y-3">
            {insights.map((i) => (
              <li key={i.key} className="rounded-lg border p-3 text-sm leading-relaxed">
                {insightText(i)}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
