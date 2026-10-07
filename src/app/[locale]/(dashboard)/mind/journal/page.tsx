"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader, useDateFormat } from "@/components/common";
import { MonthSwitcher } from "@/components/finance/shared";
import { JournalEditor } from "@/components/journal/JournalEditor";
import { useJson } from "@/hooks/use-json";
import { dateKeyToDate, monthDateKeys } from "@/lib/date";
import { type Mood } from "@/lib/journal";
import { MoodFace } from "@/components/ui/mood-face";
import { cn } from "@/lib/utils";

type Entry = { date: string; mood: Mood; title: string | null; excerpt: string; tags: string[] };
type MonthResponse = { month: string; today: string; entries: Entry[] };

export default function JournalPage() {
  const t = useTranslations("Journal");
  const formatDate = useDateFormat();
  const [month, setMonth] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const { data } = useJson<MonthResponse>(month ? `/api/journal?month=${month}` : "/api/journal");

  if (data && month === null) setMonth(data.month);
  if (data && selected === null) setSelected(data.today);

  const byDate = new Map(data?.entries.map((e) => [e.date, e]));
  const days = data ? monthDateKeys(data.month) : [];
  // Monday-first grid: blank cells before the 1st.
  const leading = days.length ? (dateKeyToDate(days[0]).getUTCDay() + 6) % 7 : 0;
  const weekdays = Array.from({ length: 7 }, (_, i) => formatDate(`2026-09-${String(7 + i).padStart(2, "0")}`, "EEEEEE"));

  return (
    <div className="space-y-6">
      <PageHeader title={t("pageTitle")}>
        {month && <MonthSwitcher month={month} onChange={setMonth} />}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_1fr]">
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              {!data ? (
                <Skeleton className="h-64" />
              ) : (
                <div className="grid grid-cols-7 gap-1 text-center">
                  {weekdays.map((w) => (
                    <div key={w} className="pb-1 text-[11px] font-medium uppercase text-muted-foreground">
                      {w}
                    </div>
                  ))}
                  {Array.from({ length: leading }, (_, i) => (
                    <div key={`blank-${i}`} />
                  ))}
                  {days.map((day) => {
                    const entry = byDate.get(day);
                    const future = day > data.today;
                    return (
                      <button
                        key={day}
                        type="button"
                        disabled={future}
                        onClick={() => setSelected(day)}
                        aria-pressed={selected === day}
                        aria-label={`${formatDate(day, "EEEE d MMMM")}${entry ? `: ${t(`moods.${entry.mood}`)}` : ""}`}
                        className={cn(
                          "flex aspect-square flex-col items-center justify-center rounded-lg text-xs transition-colors disabled:opacity-30",
                          selected === day ? "bg-primary/10 ring-1 ring-primary" : "hover:bg-muted",
                          day === data.today && selected !== day && "ring-1 ring-border"
                        )}
                      >
                        <span className="tabular-nums text-muted-foreground">{Number(day.slice(8))}</span>
                        <span className="flex h-5 items-center justify-center" aria-hidden>
                          {entry ? <MoodFace mood={entry.mood} size={18} /> : null}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {data && (
            <p className="text-sm text-muted-foreground">
              {t("monthCount", { count: data.entries.length })}
            </p>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {selected
                ? selected === data?.today
                  ? t("todayEntry")
                  : formatDate(selected, "EEEE, d MMMM yyyy")
                : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selected ? <JournalEditor key={selected} date={selected} /> : <Skeleton className="h-64" />}
          </CardContent>
        </Card>
      </div>

      {data && data.entries.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold">{t("entriesThisMonth")}</h2>
          <ul className="divide-y rounded-xl border">
            {data.entries.map((entry) => (
              <li key={entry.date}>
                <button
                  type="button"
                  onClick={() => setSelected(entry.date)}
                  className="flex w-full items-start gap-3 p-3 text-left hover:bg-muted/50"
                >
                  <MoodFace mood={entry.mood} size={24} className="mt-0.5" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs text-muted-foreground">{formatDate(entry.date, "EEEE, d MMM")}</span>
                    <span className="block truncate text-sm font-medium">{entry.title || entry.excerpt || t(`moods.${entry.mood}`)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

