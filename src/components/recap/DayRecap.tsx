"use client";

import { useTranslations } from "next-intl";
import { Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { JournalEditor } from "@/components/journal/JournalEditor";
import { useCategoryLabel, useMoney } from "@/components/finance/shared";
import { useToggleHabit } from "@/components/habits/use-toggle-habit";
import { TodoItem } from "@/components/todos/TodoItem";
import { useToggleTodo } from "@/components/todos/use-toggle-todo";
import { useQuickAdd } from "@/components/quick-add/QuickAddProvider";
import { MOOD_EMOJI, type JournalDTO } from "@/lib/journal";
import type { TodoDTO } from "@/lib/todos";
import { cn } from "@/lib/utils";
import { AiSummary } from "./AiSummary";

export type DayRecapData = {
  period: "day";
  date: string;
  today: string;
  currency: string;
  finance: {
    income: number;
    expense: number;
    transactions: { id: string; type: string; amount: number; category: string; description: string | null }[];
  };
  todos: { completed: TodoDTO[]; open: TodoDTO[] };
  habits: { id: string; name: string; icon: string | null; done: boolean }[];
  journal: JournalDTO | null;
};

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
    </div>
  );
}

export function DayRecap({ data }: { data: DayRecapData | null }) {
  const t = useTranslations("Recap");
  const tj = useTranslations("Journal");
  const money = useMoney(data?.currency);
  const categoryLabel = useCategoryLabel();
  const { toggle: toggleHabit, isDone } = useToggleHabit();
  const toggleTodo = useToggleTodo();
  const { openTransaction, openTodo } = useQuickAdd();

  if (!data) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  const isFuture = data.date > data.today;
  const habitsDone = data.habits.filter((h) => isDone(h.id, data.date, h.done)).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={t("spent")} value={money(data.finance.expense)} />
        <Stat
          label={t("tasksDone")}
          value={`${data.todos.completed.length}${data.todos.open.length ? ` / ${data.todos.completed.length + data.todos.open.length}` : ""}`}
        />
        <Stat label={t("habitsDone")} value={data.habits.length ? `${habitsDone} / ${data.habits.length}` : "—"} />
        <Stat
          label={t("mood")}
          value={
            data.journal ? (
              <span>
                <span aria-hidden>{MOOD_EMOJI[data.journal.mood]}</span> {tj(`moods.${data.journal.mood}`)}
              </span>
            ) : (
              "—"
            )
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("reflectionTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <JournalEditor key={data.date} date={data.date} compact />
            </CardContent>
          </Card>
          {!isFuture && <AiSummary period="day" date={data.date} />}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("habitsTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              {data.habits.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noHabits")}</p>
              ) : (
                <ul className="space-y-1.5">
                  {data.habits.map((h) => {
                    const done = isDone(h.id, data.date, h.done);
                    return (
                      <li key={h.id}>
                        <button
                          type="button"
                          disabled={isFuture}
                          aria-pressed={done}
                          onClick={() => toggleHabit(h.id, data.date, !done)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:opacity-50",
                            done ? "border-transparent bg-muted" : "hover:bg-muted/50"
                          )}
                        >
                          <span
                            className={cn(
                              "flex size-5 items-center justify-center rounded-md border",
                              done && "border-transparent bg-viz-1 text-white"
                            )}
                            aria-hidden
                          >
                            {done && <Check className="size-3.5" />}
                          </span>
                          <span aria-hidden>{h.icon}</span>
                          <span className={cn("flex-1", done && "text-muted-foreground")}>{h.name}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("tasksTitle")}</CardTitle>
              <Button variant="ghost" size="icon-sm" onClick={openTodo} aria-label={t("addTask")}>
                <Plus />
              </Button>
            </CardHeader>
            <CardContent>
              {data.todos.completed.length + data.todos.open.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noTasks")}</p>
              ) : (
                <ul className="divide-y">
                  {[...data.todos.open, ...data.todos.completed].map((todo) => (
                    <TodoItem key={todo.id} todo={todo} today={data.today} onToggle={toggleTodo} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>{t("moneyTitle")}</CardTitle>
              {!isFuture && (
                <Button variant="ghost" size="icon-sm" onClick={openTransaction} aria-label={t("addTransaction")}>
                  <Plus />
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {data.finance.transactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("noTransactions")}</p>
              ) : (
                <ul className="divide-y">
                  {data.finance.transactions.map((tx) => (
                    <li key={tx.id} className="flex items-center gap-3 py-2 text-sm">
                      <span className="min-w-0 flex-1 truncate">
                        {tx.description || categoryLabel(tx.category)}
                        {tx.description && (
                          <span className="ml-2 text-xs text-muted-foreground">{categoryLabel(tx.category)}</span>
                        )}
                      </span>
                      <span className={cn("font-medium tabular-nums", tx.type === "income" && "text-green-700 dark:text-green-400")}>
                        {tx.type === "income" ? "+" : "−"}
                        {money(tx.amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
