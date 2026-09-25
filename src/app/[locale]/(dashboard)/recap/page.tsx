"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, useDateFormat } from "@/components/common";
import { DayRecap, type DayRecapData } from "@/components/recap/DayRecap";
import { PeriodRecap, type PeriodRecapData } from "@/components/recap/PeriodRecap";
import { useJson } from "@/hooks/use-json";
import { addDays, isDateKey, shiftMonth } from "@/lib/date";
import type { Period } from "@/lib/recap";

type RecapData = DayRecapData | PeriodRecapData;

export default function RecapPage() {
  const t = useTranslations("Recap");
  const tc = useTranslations("Common");
  const formatDate = useDateFormat();
  const searchParams = useSearchParams();
  const initialDate = searchParams.get("date");
  const initialPeriod = searchParams.get("period");

  const [period, setPeriod] = useState<Period>(
    initialPeriod === "week" || initialPeriod === "month" ? initialPeriod : "day"
  );
  const [date, setDate] = useState<string | null>(initialDate && isDateKey(initialDate) ? initialDate : null);
  const { data } = useJson<RecapData>(`/api/recap?period=${period}${date ? `&date=${date}` : ""}`);

  const current = data?.period === period ? data : null;
  const today = data?.today;
  const anchor = date ?? today ?? null;

  const step = (dir: 1 | -1) => {
    if (!anchor) return;
    if (period === "day") setDate(addDays(anchor, dir));
    else if (period === "week") setDate(addDays(anchor, 7 * dir));
    else setDate(`${shiftMonth(anchor.slice(0, 7), dir)}-01`);
  };

  const title = () => {
    if (!current) return "";
    if (current.period === "day") {
      if (current.date === current.today) return t("today");
      if (current.date === addDays(current.today, -1)) return tc("yesterday");
      return formatDate(current.date, "EEEE, d MMMM yyyy");
    }
    if (current.period === "week") return t("weekOf", { start: formatDate(current.start, "d MMM"), end: formatDate(current.end, "d MMM yyyy") });
    return formatDate(current.start, "MMMM yyyy");
  };

  const atPresent = !!current && (current.period === "day" ? current.date >= current.today : current.end >= current.today);

  return (
    <div className="space-y-6">
      <PageHeader title={t("pageTitle")}>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            <TabsTrigger value="day">{t("periods.day")}</TabsTrigger>
            <TabsTrigger value="week">{t("periods.week")}</TabsTrigger>
            <TabsTrigger value="month">{t("periods.month")}</TabsTrigger>
          </TabsList>
        </Tabs>
      </PageHeader>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="icon-sm" onClick={() => step(-1)} aria-label={t("previous")} disabled={!anchor}>
          <ChevronLeft />
        </Button>
        <h2 className="min-w-48 text-lg font-semibold">{title()}</h2>
        <Button variant="outline" size="icon-sm" onClick={() => step(1)} aria-label={t("next")} disabled={!anchor || atPresent}>
          <ChevronRight />
        </Button>
        {!atPresent && current && (
          <Button variant="ghost" size="sm" onClick={() => setDate(null)}>
            {t("backToNow")}
          </Button>
        )}
      </div>

      {period === "day" ? (
        <DayRecap data={current?.period === "day" ? current : null} />
      ) : (
        <PeriodRecap data={current && current.period !== "day" ? current : null} />
      )}
    </div>
  );
}
