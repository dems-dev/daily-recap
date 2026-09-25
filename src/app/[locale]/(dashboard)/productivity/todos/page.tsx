"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, useFailureToast } from "@/components/common";
import { TodoItem } from "@/components/todos/TodoItem";
import { TodoDialog } from "@/components/todos/TodoDialog";
import { useToggleTodo } from "@/components/todos/use-toggle-todo";
import { sendJson, useInvalidate, useJson } from "@/hooks/use-json";
import type { TodoDTO, TodoView } from "@/lib/todos";
import { addDays } from "@/lib/date";
import { cn } from "@/lib/utils";

type TodosResponse = {
  view: TodoView;
  today: string;
  todos: TodoDTO[];
  counts: { open: number; overdue: number };
};

export default function TodosPage() {
  const t = useTranslations("Todos");
  const [view, setView] = useState<TodoView>("today");
  const [quickTitle, setQuickTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [dialog, setDialog] = useState<{ todo: TodoDTO | null } | null>(null);
  const { data, loading } = useJson<TodosResponse>(`/api/todos?view=${view}`);
  const toggle = useToggleTodo();
  const invalidate = useInvalidate();
  const onFail = useFailureToast();

  const quickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = quickTitle.trim();
    if (!title || !data) return;
    setAdding(true);
    try {
      // Tasks added from the "upcoming" tab default to tomorrow, otherwise undated (shows in Today).
      const dueDate = view === "upcoming" ? addDays(data.today, 1) : null;
      await sendJson("/api/todos", "POST", { title, dueDate });
      setQuickTitle("");
      invalidate();
    } catch (err) {
      onFail(err);
    } finally {
      setAdding(false);
    }
  };

  const today = data?.today;
  const dialogDefaults = useMemo(
    () => (view === "upcoming" && today ? { dueDate: addDays(today, 1) } : undefined),
    [view, today]
  );

  const todos = data?.view === view ? data.todos : null;
  const openCount = todos?.filter((x) => !x.isCompleted).length ?? 0;
  const doneCount = todos?.filter((x) => x.isCompleted).length ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title={t("pageTitle")}>
        <Button className="gap-2" onClick={() => setDialog({ todo: null })}>
          <Plus className="h-4 w-4" /> {t("addTask")}
        </Button>
      </PageHeader>

      {data && (
        <p className="text-sm text-muted-foreground">
          {t("summary", { open: data.counts.open, overdue: data.counts.overdue })}
        </p>
      )}

      <form onSubmit={quickAdd} className="flex gap-2">
        <Input
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder={t("quickAddPlaceholder")}
          aria-label={t("quickAddPlaceholder")}
          maxLength={200}
        />
        <Button type="submit" variant="secondary" disabled={adding || !quickTitle.trim()}>
          {t("add")}
        </Button>
      </form>

      <Tabs value={view} onValueChange={(v) => setView(v as TodoView)}>
        <TabsList>
          <TabsTrigger value="today">{t("views.today")}</TabsTrigger>
          <TabsTrigger value="upcoming">{t("views.upcoming")}</TabsTrigger>
          <TabsTrigger value="completed">{t("views.completed")}</TabsTrigger>
          <TabsTrigger value="all">{t("views.all")}</TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardContent className={cn("transition-opacity", loading && todos && "opacity-60")}>
          {!todos ? (
            <div className="space-y-3 py-2">
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
              <Skeleton className="h-8" />
            </div>
          ) : todos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <CheckCircle2 className="size-8" aria-hidden />
              {t(`empty.${view}`)}
            </div>
          ) : (
            <>
              {view === "today" && (
                <p className="pt-1 text-xs text-muted-foreground tabular-nums">
                  {t("todayProgress", { done: doneCount, total: openCount + doneCount })}
                </p>
              )}
              <ul className="divide-y">
                {todos.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    today={data!.today}
                    onToggle={toggle}
                    onOpen={(todo) => setDialog({ todo })}
                  />
                ))}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <TodoDialog
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
        todo={dialog?.todo}
        defaults={dialogDefaults}
      />
    </div>
  );
}
