"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { differenceInCalendarDays } from "date-fns";
import { CheckCircle2, Minus, Pencil, PiggyBank, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { sendJson, useJson } from "@/hooks/use-json";
import { dateKeyToLocalDate } from "@/lib/date";
import { savingsDepositSchema, savingsGoalSchema, type SavingsGoalInput } from "@/lib/finance";
import { cn } from "@/lib/utils";
import { ConfirmDialog, FieldError, useDateFormat, useMoney } from "./shared";

type Goal = {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string | null;
  isCompleted: boolean;
};
type SavingsResponse = { today: string; currency: string; goals: Goal[] };

export function SavingsTab() {
  const t = useTranslations("Finance");
  const formatDate = useDateFormat();
  const { data, loading, reload } = useJson<SavingsResponse>("/api/finance/savings");
  const money = useMoney(data?.currency);
  const [editing, setEditing] = useState<Goal | "new" | null>(null);
  const [moving, setMoving] = useState<{ goal: Goal; direction: 1 | -1 } | null>(null);
  const [deleting, setDeleting] = useState<Goal | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{t("savingsGoals")}</h2>
        <Button size="sm" className="gap-1.5" onClick={() => setEditing("new")}>
          <Plus /> {t("addGoal")}
        </Button>
      </div>

      {!data ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      ) : data.goals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <PiggyBank className="size-8" aria-hidden />
            {t("noGoals")}
          </CardContent>
        </Card>
      ) : (
        <div className={cn("grid gap-4 md:grid-cols-2 transition-opacity", loading && "opacity-60")}>
          {data.goals.map((g) => {
            const ratio = g.targetAmount > 0 ? Math.min(g.currentAmount / g.targetAmount, 1) : 0;
            const daysLeft = g.deadline
              ? differenceInCalendarDays(dateKeyToLocalDate(g.deadline), dateKeyToLocalDate(data.today))
              : null;
            return (
              <Card key={g.id}>
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                  <div className="min-w-0">
                    <CardTitle className="truncate">{g.name}</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {g.isCompleted ? (
                        <span className="inline-flex items-center gap-1 font-medium text-foreground">
                          <CheckCircle2 className="size-3.5 text-viz-good" aria-hidden />
                          {t("goalReached")}
                        </span>
                      ) : g.deadline && daysLeft !== null ? (
                        daysLeft >= 0 ? (
                          t("deadlineIn", { date: formatDate(g.deadline), days: daysLeft })
                        ) : (
                          t("deadlinePassed", { date: formatDate(g.deadline) })
                        )
                      ) : (
                        t("noDeadline")
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0">
                    <Button variant="ghost" size="icon-sm" onClick={() => setEditing(g)} aria-label={t("edit")}>
                      <Pencil />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => setDeleting(g)} aria-label={t("delete")}>
                      <Trash2 />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-baseline justify-between gap-2 tabular-nums">
                    <span className="text-xl font-bold">{money(g.currentAmount)}</span>
                    <span className="text-sm text-muted-foreground">
                      {t("ofTarget", { target: money(g.targetAmount) })}
                    </span>
                  </div>
                  <div
                    role="meter"
                    aria-label={g.name}
                    aria-valuemin={0}
                    aria-valuemax={g.targetAmount}
                    aria-valuenow={Math.min(g.currentAmount, g.targetAmount)}
                    className="h-2 overflow-hidden rounded-full bg-muted"
                  >
                    <div className="h-full rounded-full bg-viz-1" style={{ width: `${ratio * 100}%` }} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => setMoving({ goal: g, direction: 1 })}>
                      <Plus /> {t("deposit")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-1"
                      disabled={g.currentAmount <= 0}
                      onClick={() => setMoving({ goal: g, direction: -1 })}
                    >
                      <Minus /> {t("withdraw")}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <GoalDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        goal={editing === "new" ? null : editing}
        onSaved={reload}
      />
      <DepositDialog
        target={moving}
        onOpenChange={(open) => !open && setMoving(null)}
        money={money}
        onSaved={reload}
      />
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteGoalTitle")}
        description={deleting?.name}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await sendJson(`/api/finance/savings/${deleting.id}`, "DELETE");
            toast.add({ title: t("toast.deleted"), type: "success" });
            reload();
          } catch (err) {
            toast.add({ title: t("toast.failed"), description: (err as Error).message, type: "error" });
          }
        }}
      />
    </div>
  );
}

function GoalDialog({
  open,
  onOpenChange,
  goal,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal | null;
  onSaved: () => void;
}) {
  const t = useTranslations("Finance");
  const { register, handleSubmit, reset, formState } = useForm<SavingsGoalInput>({
    resolver: zodResolver(savingsGoalSchema),
  });

  useEffect(() => {
    if (!open) return;
    reset(goal ? { name: goal.name, targetAmount: goal.targetAmount, deadline: goal.deadline } : { name: "", deadline: null });
  }, [open, goal, reset]);

  const onSubmit = handleSubmit(async (values) => {
    const body = { ...values, deadline: values.deadline || null };
    try {
      if (goal) await sendJson(`/api/finance/savings/${goal.id}`, "PATCH", body);
      else await sendJson("/api/finance/savings", "POST", body);
      toast.add({ title: t("toast.saved"), type: "success" });
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.add({ title: t("toast.failed"), description: (err as Error).message, type: "error" });
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{goal ? t("editGoal") : t("addGoal")}</DialogTitle>
        </DialogHeader>
        <form id="goal-form" onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="goal-name">{t("goalName")}</Label>
            <Input id="goal-name" autoFocus aria-invalid={!!formState.errors.name} {...register("name")} />
            <FieldError message={formState.errors.name?.message} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="goal-target">{t("targetAmount")}</Label>
              <Input
                id="goal-target"
                type="number"
                inputMode="decimal"
                min={0}
                step="any"
                aria-invalid={!!formState.errors.targetAmount}
                {...register("targetAmount", { valueAsNumber: true })}
              />
              <FieldError message={formState.errors.targetAmount?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-deadline">{t("deadline")}</Label>
              <Input
                id="goal-deadline"
                type="date"
                {...register("deadline", { setValueAs: (v: string) => v || null })}
              />
              <FieldError message={formState.errors.deadline?.message} />
            </div>
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button type="submit" form="goal-form" disabled={formState.isSubmitting}>
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DepositDialog({
  target,
  onOpenChange,
  money,
  onSaved,
}: {
  target: { goal: Goal; direction: 1 | -1 } | null;
  onOpenChange: (open: boolean) => void;
  money: (n: number) => string;
  onSaved: () => void;
}) {
  const t = useTranslations("Finance");
  const { register, handleSubmit, reset, setError, formState } = useForm<{ amount: number }>();

  useEffect(() => {
    if (target) reset({});
  }, [target, reset]);

  const onSubmit = handleSubmit(async ({ amount }) => {
    if (!target) return;
    const parsed = savingsDepositSchema.safeParse({ deposit: amount * target.direction });
    if (!parsed.success || !(amount > 0)) {
      setError("amount", { message: parsed.success ? "positive" : parsed.error.issues[0].message });
      return;
    }
    if (target.direction === -1 && amount > target.goal.currentAmount) {
      setError("amount", { message: "exceedsSaved" });
      return;
    }
    try {
      await sendJson(`/api/finance/savings/${target.goal.id}`, "PATCH", parsed.data);
      toast.add({ title: t("toast.saved"), type: "success" });
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.add({ title: t("toast.failed"), description: (err as Error).message, type: "error" });
    }
  });

  return (
    <Dialog open={!!target} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {target?.direction === -1 ? t("withdrawFrom", { name: target.goal.name }) : t("depositTo", { name: target?.goal.name ?? "" })}
          </DialogTitle>
        </DialogHeader>
        <form id="deposit-form" onSubmit={onSubmit} className="space-y-2" noValidate>
          <Label htmlFor="deposit-amount">{t("amount")}</Label>
          <Input
            id="deposit-amount"
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            autoFocus
            aria-invalid={!!formState.errors.amount}
            {...register("amount", { valueAsNumber: true })}
          />
          <FieldError message={formState.errors.amount?.message} />
          {target && (
            <p className="text-xs text-muted-foreground tabular-nums">
              {t("currentlySaved", { amount: money(target.goal.currentAmount) })}
            </p>
          )}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button type="submit" form="deposit-form" disabled={formState.isSubmitting}>
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
