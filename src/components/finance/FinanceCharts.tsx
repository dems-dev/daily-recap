"use client";

import { useLocale, useTranslations } from "next-intl";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatCompact } from "@/lib/format";
import { useCategoryLabel, useDateFormat } from "./shared";

const AXIS_TICK = { fill: "var(--muted-foreground)", fontSize: 12 };

function TooltipBox({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md ring-1 ring-foreground/10">
      <div className="text-muted-foreground">{title}</div>
      <div className="mt-0.5 font-medium tabular-nums">{value}</div>
    </div>
  );
}

/** Expense per category, largest first — horizontal bars, one hue. */
export function CategoryChart({
  data,
  money,
}: {
  data: { category: string; amount: number }[];
  money: (n: number) => string;
}) {
  const t = useTranslations("Finance");
  const categoryLabel = useCategoryLabel();
  const rows = data.map((d) => ({ ...d, label: categoryLabel(d.category) }));

  if (rows.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{t("noExpenses")}</p>;
  }

  return (
    <>
      <div style={{ height: rows.length * 36 + 16 }} aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap={8}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              width={110}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.6 }}
              content={({ active, payload }) =>
                active && payload?.[0] ? (
                  <TooltipBox title={payload[0].payload.label} value={money(payload[0].payload.amount)} />
                ) : null
              }
            />
            <Bar dataKey="amount" fill="var(--viz-1)" radius={[0, 4, 4, 0]} maxBarSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{t("expenseByCategory")}</caption>
        <tbody>
          {rows.map((r) => (
            <tr key={r.category}>
              <th scope="row">{r.label}</th>
              <td>{money(r.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

/** Expense per day across the month — columns, one hue. */
export function DailyExpenseChart({
  data,
  money,
}: {
  data: { date: string; expense: number }[];
  money: (n: number) => string;
}) {
  const t = useTranslations("Finance");
  const locale = useLocale();
  const formatDate = useDateFormat();
  const rows = data.map((d) => ({ ...d, day: Number(d.date.slice(8, 10)) }));

  if (!rows.some((r) => r.expense > 0)) {
    return <p className="py-10 text-center text-sm text-muted-foreground">{t("noExpenses")}</p>;
  }

  return (
    <>
      <div className="h-56" aria-hidden>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 0, bottom: 0, left: 0 }} barCategoryGap={2}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis
              dataKey="day"
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              ticks={rows.filter((r) => r.day === 1 || r.day % 5 === 0).map((r) => r.day)}
            />
            <YAxis
              width={48}
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => formatCompact(v, locale)}
            />
            <Tooltip
              cursor={{ fill: "var(--muted)", opacity: 0.6 }}
              content={({ active, payload }) =>
                active && payload?.[0] ? (
                  <TooltipBox
                    title={formatDate(payload[0].payload.date, "EEEE, d MMM")}
                    value={money(payload[0].payload.expense)}
                  />
                ) : null
              }
            />
            <Bar dataKey="expense" fill="var(--viz-1)" radius={[4, 4, 0, 0]} maxBarSize={18} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{t("dailyExpense")}</caption>
        <tbody>
          {rows
            .filter((r) => r.expense > 0)
            .map((r) => (
              <tr key={r.date}>
                <th scope="row">{formatDate(r.date)}</th>
                <td>{money(r.expense)}</td>
              </tr>
            ))}
        </tbody>
      </table>
    </>
  );
}
