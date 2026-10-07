"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Target, Plus, ChevronDown, ChevronRight, CheckCircle2, Circle, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader, useDateFormat, ConfirmDialog, useFailureToast } from "@/components/common";
import { useJson, sendJson, useInvalidate } from "@/hooks/use-json";
import { type GoalDTO, type MilestoneDTO } from "@/lib/goals";
import { daysBetween, todayKey } from "@/lib/date";
import { GoalDialog } from "@/components/productivity/GoalDialog";
import { MilestoneDialog } from "@/components/productivity/MilestoneDialog";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export default function GoalsPage() {
  const t = useTranslations("Productivity");
  const { data, loading } = useJson<{ goals: GoalDTO[] }>("/api/goals");
  const invalidate = useInvalidate();
  const onFail = useFailureToast();
  const format = useDateFormat();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalDTO | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false);
  const [milestoneGoalId, setMilestoneGoalId] = useState<string | null>(null);
  const [editingMilestone, setEditingMilestone] = useState<{ id: string; title: string } | null>(null);

  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());

  const toggleExpanded = (id: string) => {
    setExpandedGoals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    try {
      await sendJson(`/api/goals/${deletingId}`, "DELETE");
      invalidate();
    } catch (err) {
      onFail(err);
    }
  };

  const toggleMilestone = async (goalId: string, milestone: MilestoneDTO) => {
    try {
      await sendJson(`/api/goals/${goalId}/milestones/${milestone.id}`, "PATCH", {
        isCompleted: !milestone.isCompleted,
      });
      invalidate();
    } catch (err) {
      onFail(err);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("goalsTitle")}>
        <Button
          onClick={() => {
            setEditingGoal(null);
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t("addGoal")}
        </Button>
      </PageHeader>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : data?.goals.length === 0 ? (
        <Card className="flex h-40 flex-col items-center justify-center text-center">
          <Target className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-muted-foreground">{t("noGoals")}</p>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {data?.goals.map((goal) => {
            const isExpanded = expandedGoals.has(goal.id);
            return (
              <Card key={goal.id} className="flex flex-col">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg leading-tight">{goal.title}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {goal.category}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px] capitalize">
                          {goal.type.replace("-", " ")}
                        </Badge>
                        {goal.targetDate && !goal.isCompleted ? (
                          (() => {
                            const days = daysBetween(todayKey(tz), goal.targetDate);
                            const label = days > 0 ? t("daysLeft", { days }) : days === 0 ? t("dueToday") : t("overdue", { days: -days });
                            return (
                              <span className={`inline-flex items-center gap-1 text-xs ${days < 0 ? "text-destructive" : "text-muted-foreground"}`}>
                                <CalendarClock className="size-3" /> {label}
                              </span>
                            );
                          })()
                        ) : goal.targetDate ? (
                          <span className="text-xs text-muted-foreground">{format(goal.targetDate)}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 pb-4">
                  {goal.description && <p className="text-sm text-muted-foreground mb-4">{goal.description}</p>}

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{t("progress")}</span>
                      <span className="text-muted-foreground">{Math.round(goal.progress * 100)}%</span>
                    </div>
                    <Progress value={goal.progress * 100} className="h-2" />
                  </div>

                  <div className="mt-6 space-y-2">
                    <button
                      className="flex w-full items-center justify-between text-sm font-medium hover:text-primary transition-colors"
                      onClick={() => toggleExpanded(goal.id)}
                    >
                      Milestones ({goal.milestones.length})
                      {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>

                    {isExpanded && (
                      <div className="space-y-1 pl-2 pt-2 border-l-2 border-muted">
                        {goal.milestones.map((m) => (
                          <div key={m.id} className="flex items-center gap-2 group">
                            <button
                              onClick={() => toggleMilestone(goal.id, m)}
                              className="text-muted-foreground hover:text-primary transition-colors"
                            >
                              {m.isCompleted ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <Circle className="h-4 w-4" />
                              )}
                            </button>
                            <span
                              className={cn(
                                "flex-1 text-sm transition-colors",
                                m.isCompleted && "text-muted-foreground line-through"
                              )}
                            >
                              {m.title}
                            </span>
                          </div>
                        ))}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2 text-xs text-muted-foreground w-full justify-start mt-2"
                          onClick={() => {
                            setMilestoneGoalId(goal.id);
                            setEditingMilestone(null);
                            setMilestoneDialogOpen(true);
                          }}
                        >
                          <Plus className="mr-1 h-3 w-3" /> Add Milestone
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex gap-2 pt-0 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingGoal(goal);
                      setDialogOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setDeletingId(goal.id)}
                  >
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <GoalDialog open={dialogOpen} onOpenChange={setDialogOpen} goal={editingGoal} />
      <MilestoneDialog
        open={milestoneDialogOpen}
        onOpenChange={setMilestoneDialogOpen}
        goalId={milestoneGoalId!}
        milestone={editingMilestone}
      />
      <ConfirmDialog
        open={!!deletingId}
        onOpenChange={(open) => !open && setDeletingId(null)}
        title={t("deleteGoalTitle")}
        description={t("deleteGoalDesc")}
        onConfirm={handleDelete}
      />
    </div>
  );
}
