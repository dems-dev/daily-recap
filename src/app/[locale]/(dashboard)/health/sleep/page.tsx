"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Trash2, Star } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toast";
import { ConfirmDialog, PageHeader, useDateFormat, useFailureToast } from "@/components/common";
import { SleepForm, type SleepLogDTO } from "@/components/sleep/SleepForm";
import { sendJson, useInvalidate, useJson } from "@/hooks/use-json";
import { addDays } from "@/lib/date";
import { formatDuration } from "@/lib/sleep";

type SleepResponse = {
  days: number;
  today: string;
  start: string;
  logs: SleepLogDTO[];
  stats: {
    nights: number;
    avgDuration: number | null;
    avgQuality: number | null;
    avgBedtime: string | null;
    bedtimeSpread: number | null;
    shortNights: number;
  };
};

const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 12 };
const TARGET_HOURS = 7;

function Stat({ label, value, detail }: { label: string; value: React.ReactNode; detail?: string }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
      {detail && <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}

export default function SleepPage() {
  const t = useTranslations("Sleep");
  const locale = useLocale();
  const formatDate = useDateFormat();
  const invalidate = useInvalidate();
  const onFail = useFailureToast();
  const [days, setDays] = useState(14);
  const [date, setDate] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const { data } = useJson<SleepResponse>(`/api/sleep?days=${days}`);

  const selected = date ?? data?.today ?? null;
  const existing = data?.logs.find((l) => l.date === selected) ?? null;

  // One bar per night in the range, empty where nothing was logged.
  const series = data
    ? (() => {
        const byDate = new Map(data.logs.map((l) => [l.date, l]));
        const keys: string[] = [];
        for (let d = data.start; d <= data.today; d = addDays(d, 1)) keys.push(d);
        return keys.map((d) => ({ date: d, hours: byDate.has(d) ? byDate.get(d)!.duration / 60 : null, log: byDate.get(d) ?? null }));
      })()
    : [];

  return (
    <div className="space-y-6">
      <PageHeader title={t("pageTitle")}>
        <Tabs value={String(days)} onValueChange={(v) => setDays(Number(v))}>
          <TabsList>
            {[14, 30, 90].map((d) => (
              <TabsTrigger key={d} value={String(d)}>
                {t("lastDays", { days: d })}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </PageHeader>

      {!data ? (
        <Skeleton className="h-80" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Stat
              label={t("avgDuration")}
              value={data.stats.avgDuration ? formatDuration(Math.round(data.stats.avgDuration), locale) : "-"}
              detail={t("nightsLogged", { count: data.stats.nights })}
            />
            <Stat label={t("avgBedtime")} value={data.stats.avgBedtime ?? "-"} />
            <Stat
              label={t("consistency")}
              value={data.stats.bedtimeSpread !== null ? `± ${data.stats.bedtimeSpread}m` : "-"}
              detail={t("consistencyHint")}
            />
            <Stat
              label={t("shortNights")}
              value={data.stats.shortNights}
              detail={data.stats.avgQuality ? t("avgQuality", { value: data.stats.avgQuality.toFixed(1) }) : undefined}
            />
            {(() => {
              const debt = data.logs.reduce((s, l) => s + (TARGET_HOURS * 60 - l.duration), 0);
              return (
                <Stat
                  label={t("sleepDebt")}
                  value={data.stats.nights ? formatDuration(Math.abs(debt), locale) : "-"}
                  detail={data.stats.nights ? (debt > 0 ? t("behind") : t("ahead")) : t("debtHint", { hours: TARGET_HOURS })}
                />
              );
            })()}
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader>
                <CardTitle>{t("durationChart")}</CardTitle>
                <p className="text-sm text-muted-foreground">{t("durationChartDesc", { hours: TARGET_HOURS })}</p>
              </CardHeader>
              <CardContent>
                {data.logs.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">{t("empty")}</p>
                ) : (
                  <div className="h-60" role="img" aria-label={t("durationChart")}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={series}
                        margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
                        barCategoryGap={2}
                        onClick={(e) => {
                          const d = (e as { activeLabel?: string } | null)?.activeLabel;
                          if (d) setDate(String(d));
                        }}
                      >
                        <CartesianGrid vertical={false} stroke="var(--border)" />
                        <XAxis
                          dataKey="date"
                          tick={AXIS_TICK}
                          tickLine={false}
                          axisLine={{ stroke: "var(--border)" }}
                          minTickGap={24}
                          tickFormatter={(d: string) => formatDate(d, "d MMM")}
                        />
                        <YAxis domain={[0, 10]} ticks={[0, 2, 4, 6, 8, 10]} width={28} tick={AXIS_TICK} tickLine={false} axisLine={false} />
                        <ReferenceLine y={TARGET_HOURS} stroke="var(--muted-foreground)" strokeDasharray="4 4" />
                        <Tooltip
                          cursor={{ fill: "var(--muted)", opacity: 0.6 }}
                          content={({ active, payload }) => {
                            const log = active ? (payload?.[0]?.payload.log as SleepLogDTO | null) : null;
                            if (!active || !payload?.[0]) return null;
                            return (
                              <div className="rounded-lg bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10">
                                <div className="text-muted-foreground">{formatDate(payload[0].payload.date, "EEEE, d MMM")}</div>
                                <div className="mt-0.5 font-medium tabular-nums">
                                  {log ? `${log.bedtime} → ${log.wakeTime} · ${formatDuration(log.duration, locale)}` : t("notLogged")}
                                </div>
                                {log && <div className="text-muted-foreground">{t("qualityValue", { value: log.quality })}</div>}
                              </div>
                            );
                          }}
                        />
                        <Bar dataKey="hours" fill="var(--viz-1)" radius={[4, 4, 0, 0]} maxBarSize={24} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{selected === data.today ? t("lastNight") : t("nightBefore", { date: formatDate(selected!, "EEEE, d MMM") })}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="sleep-date">{t("wokeUpOn")}</Label>
                  <Input
                    id="sleep-date"
                    type="date"
                    max={data.today}
                    value={selected ?? ""}
                    onChange={(e) => e.target.value && setDate(e.target.value)}
                  />
                </div>
                <SleepForm key={`${selected}|${existing?.duration ?? "new"}`} date={selected!} existing={existing} />
              </CardContent>
            </Card>
          </div>

          {data.logs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>{t("history")}</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {[...data.logs].reverse().map((log) => (
                    <li key={log.date} className="flex items-center gap-3 py-2 text-sm">
                      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => setDate(log.date)}>
                        <span className="font-medium">{formatDate(log.date, "EEE, d MMM")}</span>
                        <span className="ml-2 text-muted-foreground tabular-nums">
                          {log.bedtime} → {log.wakeTime}
                        </span>
                      </button>
                      <span className="tabular-nums">{formatDuration(log.duration, locale)}</span>
                      <span className="flex w-10 items-center justify-end gap-0.5 text-muted-foreground tabular-nums" aria-label={t("qualityValue", { value: log.quality })}>
                        <Star className="size-3.5 fill-amber-400 text-amber-400" /> {log.quality}
                      </span>
                      <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(log.date)} aria-label={t("delete")}>
                        <Trash2 />
                      </Button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteTitle")}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await sendJson(`/api/sleep/${deleting}`, "DELETE");
            toast.add({ title: t("deleted"), type: "success" });
            invalidate();
          } catch (err) {
            onFail(err);
          }
        }}
      />
    </div>
  );
}
