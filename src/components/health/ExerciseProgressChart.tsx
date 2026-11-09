"use client";

import { useTranslations } from "next-intl";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDateFormat } from "@/components/common";
import type { HistoryPoint } from "@/lib/exercises";

const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 12 };

/**
 * One exercise over time: the heaviest set and the 1RM estimate for a weighted
 * exercise, the best set of reps for a bodyweight one.
 */
export default function ExerciseProgressChart({
  points,
  bodyweight,
}: {
  points: HistoryPoint[];
  bodyweight: boolean;
}) {
  const t = useTranslations("Workout");
  const formatDate = useDateFormat();

  return (
    <div className="h-64" role="img" aria-label={bodyweight ? t("records.chartReps") : t("records.chartWeight")}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points as HistoryPoint[]} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis
            dataKey="date"
            tick={AXIS_TICK}
            tickLine={false}
            axisLine={{ stroke: "var(--border)" }}
            minTickGap={32}
            tickFormatter={(date: string) => formatDate(date, "d MMM")}
          />
          <YAxis width={44} tick={AXIS_TICK} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as HistoryPoint | undefined;
              if (!active || !point) return null;
              const lines = bodyweight
                ? [point.reps !== null ? t("records.reps", { value: point.reps }) : null]
                : [
                    point.weight !== null
                      ? `${t("records.heaviest")}: ${t("records.kg", { value: point.weight })}`
                      : null,
                    point.oneRm !== null
                      ? `${t("records.oneRm")}: ${t("records.kg", { value: point.oneRm })}`
                      : null,
                  ];
              return (
                <div className="rounded-lg bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10">
                  <div className="text-muted-foreground">{formatDate(point.date, "EEEE, d MMM")}</div>
                  {lines.filter(Boolean).map((line) => (
                    <div key={line} className="mt-0.5 font-medium tabular-nums">
                      {line}
                    </div>
                  ))}
                </div>
              );
            }}
          />
          {bodyweight ? (
            <Line type="monotone" dataKey="reps" stroke="var(--viz-1)" strokeWidth={2} dot={false} connectNulls />
          ) : (
            <>
              <Line type="monotone" dataKey="weight" stroke="var(--viz-1)" strokeWidth={2} dot={false} connectNulls />
              <Line
                type="monotone"
                dataKey="oneRm"
                stroke="var(--viz-2)"
                strokeWidth={2}
                strokeDasharray="4 3"
                dot={false}
                connectNulls
              />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
