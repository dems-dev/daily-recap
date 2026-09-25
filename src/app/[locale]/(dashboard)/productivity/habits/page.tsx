"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Archive, ArchiveRestore, Check, Flame, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { ConfirmDialog, PageHeader, useDateFormat, useFailureToast } from "@/components/common";
import { HabitDialog } from "@/components/habits/HabitDialog";
import { useToggleHabit } from "@/components/habits/use-toggle-habit";
import type { HabitDTO, HabitsResponse } from "@/components/habits/habit-types";
import { sendJson, useInvalidate, useJson } from "@/hooks/use-json";
import { cn } from "@/lib/utils";

export default function HabitsPage() {
  const t = useTranslations("Habits");
  const tc = useTranslations("Common");
  const formatDate = useDateFormat();
  const [archived, setArchived] = useState(false);
  const { data } = useJson<HabitsResponse>(`/api/habits${archived ? "?archived=1" : ""}`);
  const { toggle, isDone } = useToggleHabit();
  const invalidate = useInvalidate();
  const onFail = useFailureToast();
  const [dialog, setDialog] = useState<{ habit: HabitDTO | null } | null>(null);
  const [deleting, setDeleting] = useState<HabitDTO | null>(null);

  const setActive = async (habit: HabitDTO, isActive: boolean) => {
    try {
      await sendJson(`/api/habits/${habit.id}`, "PATCH", { isActive });
      toast.add({ title: isActive ? t("restored") : t("archived"), type: "success" });
      invalidate();
    } catch (err) {
      onFail(err);
    }
  };

  const doneToday = data ? data.habits.filter((h) => isDone(h.id, data.today, h.days[data.today])).length : 0;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title={archived ? t("archiveTitle") : t("pageTitle")}>
        {!archived && (
          <Button className="gap-2" onClick={() => setDialog({ habit: null })}>
            <Plus className="h-4 w-4" /> {t("addHabit")}
          </Button>
        )}
      </PageHeader>

      {data && !archived && data.habits.length > 0 && (
        <p className="text-sm text-muted-foreground tabular-nums">
          {t("todayProgress", { done: doneToday, total: data.habits.length })}
        </p>
      )}

      <Card>
        <CardContent className="py-2">
          {!data ? (
            <div className="space-y-3 py-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : data.habits.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {archived ? t("emptyArchive") : t("empty")}
            </p>
          ) : (
            <ul className="divide-y">
              {data.habits.map((habit) => (
                <li key={habit.id} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <span className="text-2xl" aria-hidden>
                      {habit.icon ?? "•"}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{habit.name}</p>
                      <p className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
                        <span className="inline-flex items-center gap-1">
                          <Flame className="size-3.5" aria-hidden />
                          {t("streak", { count: habit.currentStreak })}
                        </span>
                        <span>{t("best", { count: habit.bestStreak })}</span>
                        <span>{t("rate", { percent: Math.round(habit.rate30 * 100) })}</span>
                      </p>
                    </div>
                  </div>

                  {!archived && (
                    <div className="flex gap-1" role="group" aria-label={t("last7Days", { name: habit.name })}>
                      {data.days.map((day) => {
                        const done = isDone(habit.id, day, habit.days[day]);
                        const isToday = day === data.today;
                        return (
                          <button
                            key={day}
                            type="button"
                            aria-pressed={done}
                            aria-label={`${formatDate(day, "EEEE d MMM")}: ${done ? t("done") : t("notDone")}`}
                            onClick={() => toggle(habit.id, day, !done)}
                            className={cn(
                              "flex h-11 w-9 flex-col items-center justify-center rounded-lg border text-[10px] leading-tight transition-colors",
                              done
                                ? "border-transparent bg-viz-1 text-white"
                                : "border-border text-muted-foreground hover:bg-muted",
                              isToday && !done && "border-foreground/40"
                            )}
                          >
                            <span className="uppercase">{formatDate(day, "EEEEE")}</span>
                            {done ? (
                              <Check className="size-3.5" aria-hidden />
                            ) : (
                              <span className="text-xs font-medium tabular-nums">{formatDate(day, "d")}</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="ghost" size="icon-sm" className="self-end sm:self-auto" />}
                      aria-label={tc("more")}
                    >
                      <MoreHorizontal />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!archived && (
                        <DropdownMenuItem onClick={() => setDialog({ habit })}>
                          <Pencil /> {tc("edit")}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => setActive(habit, archived)}>
                        {archived ? <ArchiveRestore /> : <Archive />} {archived ? t("restore") : t("archive")}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem variant="destructive" onClick={() => setDeleting(habit)}>
                        <Trash2 /> {tc("delete")}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Button variant="link" className="px-0" onClick={() => setArchived((a) => !a)}>
        {archived ? t("backToActive") : t("showArchive")}
      </Button>

      <HabitDialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)} habit={dialog?.habit} />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteTitle")}
        description={t("deleteDescription")}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await sendJson(`/api/habits/${deleting.id}`, "DELETE");
            toast.add({ title: tc("deleted"), type: "success" });
            invalidate();
          } catch (err) {
            onFail(err);
          }
        }}
      />
    </div>
  );
}
