"use client";

import { useTranslations } from "next-intl";
import { useReducedMotion } from "framer-motion";
import { format } from "date-fns";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { dateKeyToLocalDate } from "@/lib/date";
import { useDateLocale } from "@/components/common";

const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 12 };

export type WeekDay = { date: string; activity: number };

function TooltipBox({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10">
      <div className="text-muted-foreground">{title}</div>
      <div className="mt-0.5 font-medium tabular-nums">{value}</div>
    </div>
  );
}

/** Daily activity score across the last 7 days - one hue, today emphasized. */
export function WeeklyActivityChart({ data }: { data: WeekDay[] }) {
  const t = useTranslations("Dashboard");
  const dateLocale = useDateLocale();
  const reduce = useReducedMotion();
  const today = data.length ? data[data.length - 1].date : "";
  const rows = data.map((d) => ({
    ...d,
    label: format(dateKeyToLocalDate(d.date), "EEE", { locale: dateLocale }),
  }));

  return (
    <>
      <div className="h-44" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 4, bottom: 0, left: 0 }} barCategoryGap={10}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: "var(--border)" }} />
            <YAxis hide domain={[0, 100]} />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.6 }}
              content={({ active, payload }) =>
                active && payload?.[0] ? (
                  <TooltipBox
                    title={format(dateKeyToLocalDate(payload[0].payload.date), "EEEE, d MMM", { locale: dateLocale })}
                    value={t("activePercent", { value: payload[0].payload.activity })}
                  />
                ) : null
              }
            />
            <Bar
              dataKey="activity"
              radius={[6, 6, 0, 0]}
              maxBarSize={38}
              isAnimationActive={!reduce}
              animationBegin={200}
              animationDuration={800}
              animationEasing="ease-out"
            >
              {rows.map((r) => (
                <Cell key={r.date} fill="var(--primary)" fillOpacity={r.date === today ? 1 : 0.45} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{t("weeklyActivity")}</caption>
        <tbody>
          {rows.map((r) => (
            <tr key={r.date}>
              <th scope="row">{format(dateKeyToLocalDate(r.date), "EEEE, d MMM", { locale: dateLocale })}</th>
              <td>{t("activePercent", { value: r.activity })}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
