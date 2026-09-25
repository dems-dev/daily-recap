"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowDownRight, ArrowUpRight, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { sendJson } from "@/hooks/use-json";
import { cn } from "@/lib/utils";
import { CategoryChart, DailyExpenseChart } from "./FinanceCharts";
import { ConfirmDialog, useCategoryLabel, useDateFormat } from "./shared";
import type { Transaction } from "./TransactionDialog";

export type FinanceMonth = {
  month: string;
  today: string;
  currency: string;
  transactions: Transaction[];
  summary: { income: number; expense: number; balance: number; dailyAvgExpense: number };
  expenseByCategory: { category: string; amount: number }[];
  daily: { date: string; income: number; expense: number }[];
};

type Filter = "all" | "income" | "expense";

export function TransactionsTab({
  data,
  loading,
  money,
  onEdit,
  onChanged,
}: {
  data: FinanceMonth | null;
  loading: boolean;
  money: (n: number) => string;
  onEdit: (tx: Transaction) => void;
  onChanged: () => void;
}) {
  const t = useTranslations("Finance");
  const categoryLabel = useCategoryLabel();
  const formatDate = useDateFormat();
  const [filter, setFilter] = useState<Filter>("all");
  const [deleting, setDeleting] = useState<Transaction | null>(null);

  const groups = useMemo(() => {
    const list = (data?.transactions ?? []).filter((tx) => filter === "all" || tx.type === filter);
    const byDate = new Map<string, Transaction[]>();
    for (const tx of list) byDate.set(tx.date, [...(byDate.get(tx.date) ?? []), tx]);
    return [...byDate.entries()];
  }, [data, filter]);

  if (!data) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const { summary } = data;
  const stats = [
    { label: t("income"), value: summary.income, icon: ArrowUpRight },
    { label: t("expense"), value: summary.expense, icon: ArrowDownRight },
    { label: t("balance"), value: summary.balance },
    { label: t("dailyAvg"), value: summary.dailyAvgExpense },
  ];

  return (
    <div className={cn("space-y-4 transition-opacity", loading && "opacity-60")}>
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
                {s.icon && <s.icon className="size-4" aria-hidden />}
                {s.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold tabular-nums sm:text-2xl">{money(s.value)}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("dailyExpense")}</CardTitle>
          </CardHeader>
          <CardContent>
            <DailyExpenseChart data={data.daily} money={money} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("expenseByCategory")}</CardTitle>
          </CardHeader>
          <CardContent>
            <CategoryChart data={data.expenseByCategory} money={money} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle>{t("transactions")}</CardTitle>
          <div className="flex gap-1" role="group" aria-label={t("filter")}>
            {(["all", "income", "expense"] as const).map((f) => (
              <Button
                key={f}
                size="sm"
                variant={filter === f ? "secondary" : "ghost"}
                aria-pressed={filter === f}
                onClick={() => setFilter(f)}
              >
                {t(f === "all" ? "all" : f)}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {groups.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("noTransactions")}</p>
          ) : (
            <div className="space-y-5">
              {groups.map(([date, items]) => (
                <section key={date}>
                  <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {date === data.today ? t("today") : formatDate(date, "EEEE, d MMM")}
                  </h3>
                  <ul className="divide-y">
                    {items.map((tx) => (
                      <li key={tx.id} className="group flex items-center gap-3 py-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{tx.description || categoryLabel(tx.category)}</p>
                          {tx.description && (
                            <p className="truncate text-xs text-muted-foreground">{categoryLabel(tx.category)}</p>
                          )}
                        </div>
                        <span
                          className={cn(
                            "text-sm font-medium tabular-nums",
                            tx.type === "income" ? "text-green-700 dark:text-green-400" : "text-foreground"
                          )}
                        >
                          {tx.type === "income" ? "+" : "−"}
                          {money(tx.amount)}
                        </span>
                        <div className="flex opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                          <Button variant="ghost" size="icon-sm" onClick={() => onEdit(tx)} aria-label={t("edit")}>
                            <Pencil />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(tx)} aria-label={t("delete")}>
                            <Trash2 />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteTransactionTitle")}
        description={deleting ? `${deleting.description || categoryLabel(deleting.category)} · ${money(deleting.amount)}` : undefined}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await sendJson(`/api/finance/${deleting.id}`, "DELETE");
            toast.add({ title: t("toast.deleted"), type: "success" });
            onChanged();
          } catch (err) {
            toast.add({ title: t("toast.failed"), description: (err as Error).message, type: "error" });
          }
        }}
      />
    </div>
  );
}
