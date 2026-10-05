"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Scale, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PageHeader, useDateFormat } from "@/components/common";
import { useJson } from "@/hooks/use-json";
import { type BodyMetricDTO } from "@/lib/body-metrics";
import { BodyMetricDialog } from "@/components/health/BodyMetricDialog";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";

export default function BodyMetricsPage() {
  const t = useTranslations("Health");
  const { data, loading } = useJson<{ metrics: BodyMetricDTO[] }>("/api/body");
  const format = useDateFormat();

  const [dialogOpen, setDialogOpen] = useState(false);

  const metrics = data?.metrics;
  const chartData = useMemo(() => {
    if (!metrics) return [];
    // Sort oldest first for the chart
    return [...metrics]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((m) => ({
        ...m,
        dateFormatted: format(m.date, "d MMM"),
      }));
  }, [metrics, format]);

  const latest = metrics?.[0];

  return (
    <div className="space-y-6">
      <PageHeader title={t("bodyTitle")}>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          {t("logBody")}
        </Button>
      </PageHeader>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("latestWeight")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-10 w-24 animate-pulse rounded bg-muted" />
            ) : latest?.weight ? (
              <div className="text-3xl font-bold">
                {latest.weight} <span className="text-sm font-normal text-muted-foreground">kg</span>
              </div>
            ) : (
              <div className="text-3xl font-bold text-muted-foreground">-</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {latest ? format(latest.date) : "No data"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">{t("latestBodyFat")}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="h-10 w-24 animate-pulse rounded bg-muted" />
            ) : latest?.bodyFat ? (
              <div className="text-3xl font-bold">
                {latest.bodyFat} <span className="text-sm font-normal text-muted-foreground">%</span>
              </div>
            ) : (
              <div className="text-3xl font-bold text-muted-foreground">-</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            {t("weightTrend")}
          </CardTitle>
          <CardDescription>Last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-72 animate-pulse rounded-xl bg-muted" />
          ) : chartData.length < 2 ? (
            <div className="flex h-72 items-center justify-center text-muted-foreground">
              Not enough data for chart
            </div>
          ) : (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted))" />
                  <XAxis dataKey="dateFormatted" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} />
                  <YAxis domain={["dataMin - 1", "dataMax + 1"]} axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{ borderRadius: "8px", border: "1px solid hsl(var(--border))" }}
                    labelStyle={{ fontWeight: "bold", color: "hsl(var(--foreground))" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    name="Weight (kg)"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <BodyMetricDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
