"use client";

import { useTranslations } from "next-intl";
import { AlertCircle, CalendarDays, Flag } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useDateFormat } from "@/components/common";
import { daysBetween, type DateKey } from "@/lib/date";
import type { TodoDTO } from "@/lib/todos";
import { cn } from "@/lib/utils";

export function TodoItem({
  todo,
  today,
  onToggle,
  onOpen,
}: {
  todo: TodoDTO;
  today: DateKey;
  onToggle: (todo: TodoDTO, done: boolean) => void;
  onOpen?: (todo: TodoDTO) => void;
}) {
  const t = useTranslations("Todos");
  const formatDate = useDateFormat();

  const diff = todo.dueDate ? daysBetween(today, todo.dueDate) : null;
  const overdue = !todo.isCompleted && diff !== null && diff < 0;
  const dueLabel =
    diff === null
      ? null
      : overdue
        ? t("overdueBy", { days: -diff })
        : diff === 0
          ? t("dueToday")
          : diff === 1
            ? t("dueTomorrow")
            : formatDate(todo.dueDate!, "EEE, d MMM");

  return (
    <li className="flex items-start gap-3 py-2.5">
      <Checkbox
        className="mt-0.5"
        checked={todo.isCompleted}
        onCheckedChange={(checked) => onToggle(todo, checked === true)}
        aria-label={t(todo.isCompleted ? "markOpen" : "markDone", { title: todo.title })}
      />
      <button
        type="button"
        className="min-w-0 flex-1 text-left disabled:cursor-default"
        onClick={() => onOpen?.(todo)}
        disabled={!onOpen}
      >
        <p className={cn("text-sm font-medium", todo.isCompleted && "text-muted-foreground line-through")}>
          {todo.title}
        </p>
        {(dueLabel || todo.priority || todo.category) && (
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {dueLabel && (
              <span className={cn("inline-flex items-center gap-1", overdue && "font-medium text-foreground")}>
                {overdue ? (
                  <AlertCircle className="size-3.5 text-viz-critical" aria-hidden />
                ) : (
                  <CalendarDays className="size-3.5" aria-hidden />
                )}
                {dueLabel}
              </span>
            )}
            {todo.priority && (
              <span className="inline-flex items-center gap-1">
                <Flag className={cn("size-3.5", todo.priority === "high" && "fill-current")} aria-hidden />
                {t(`priority.${todo.priority}`)}
              </span>
            )}
            {todo.category && <span>{t(`category.${todo.category}`)}</span>}
          </p>
        )}
      </button>
    </li>
  );
}
