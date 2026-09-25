"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertTriangle, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/components/ui/toast";
import { sendJson, useJson } from "@/hooks/use-json";
import { budgetSchema, EXPENSE_CATEGORIES, type BudgetInput } from "@/lib/finance";
import { cn } from "@/lib/utils";
import { ConfirmDialog, FieldError, useCategoryLabel } from "./shared";

type Budget = { id: string; category: string; amount: number; spent: number };
type BudgetResponse = { month: string; currency: string; budgets: Budget[] };

export function BudgetTab({
  month,
  refreshKey,
  money,
  onChanged,
}: {
  month: string;
  refreshKey: number;
  money: (n: number) => string;
  onChanged: () => void;
}) {
  const t = useTranslations("Finance");
  const categoryLabel = useCategoryLabel();
  const { data, loading } = useJson<BudgetResponse>(`/api/finance/budgets?month=${month}`, refreshKey);
  const [editing, setEditing] = useState<Budget | "new" | null>(null);
  const [deleting, setDeleting] = useState<Budget | null>(null);

  const budgets = data?.budgets ?? [];
  const totalBudget = budgets.reduce((a, b) => a + b.amount, 0);
  const totalSpent = budgets.reduce((a, b) => a + b.spent, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <div>
          <CardTitle>{t("monthlyBudget")}</CardTitle>
          {budgets.length > 0 && (
            <p className="mt-1 text-sm text-muted-foreground tabular-nums">
              {t("budgetTotal", { spent: money(totalSpent), total: money(totalBudget) })}
            </p>
          )}
        </div>
        <Button size="sm" className="gap-1.5" onClick={() => setEditing("new")}>
          <Plus /> {t("addBudget")}
        </Button>
      </CardHeader>
      <CardContent className={cn("transition-opacity", loading && data && "opacity-60")}>
        {!data ? (
          <div className="space-y-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : budgets.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("noBudgets")}</p>
        ) : (
          <ul className="space-y-5">
            {budgets.map((b) => {
              const ratio = b.amount > 0 ? b.spent / b.amount : 0;
              const over = b.spent > b.amount;
              return (
                <li key={b.id} className="group space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="flex-1 text-sm font-medium">{categoryLabel(b.category)}</span>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {money(b.spent)} / {money(b.amount)}
                    </span>
                    <div className="flex opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
                      <Button variant="ghost" size="icon-xs" onClick={() => setEditing(b)} aria-label={t("edit")}>
                        <Pencil />
                      </Button>
                      <Button variant="ghost" size="icon-xs" onClick={() => setDeleting(b)} aria-label={t("delete")}>
                        <Trash2 />
                      </Button>
                    </div>
                  </div>
                  <div
                    role="meter"
                    aria-label={categoryLabel(b.category)}
                    aria-valuemin={0}
                    aria-valuemax={b.amount}
                    aria-valuenow={Math.min(b.spent, b.amount)}
                    className="h-2 overflow-hidden rounded-full bg-muted"
                  >
                    <div
                      className={cn("h-full rounded-full", over ? "bg-viz-critical" : "bg-viz-1")}
                      style={{ width: `${Math.min(ratio, 1) * 100}%` }}
                    />
                  </div>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
                    {over ? (
                      <>
                        <AlertTriangle className="size-3.5 text-viz-critical" aria-hidden />
                        <span className="font-medium text-foreground">
                          {t("overBudget", { amount: money(b.spent - b.amount) })}
                        </span>
                      </>
                    ) : (
                      t("remaining", { amount: money(b.amount - b.spent), percent: Math.round(ratio * 100) })
                    )}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <BudgetDialog
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        budget={editing === "new" ? null : editing}
        month={month}
        onSaved={onChanged}
      />

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={t("deleteBudgetTitle")}
        description={deleting ? categoryLabel(deleting.category) : undefined}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await sendJson(`/api/finance/budgets/${deleting.id}`, "DELETE");
            toast.add({ title: t("toast.deleted"), type: "success" });
            onChanged();
          } catch (err) {
            toast.add({ title: t("toast.failed"), description: (err as Error).message, type: "error" });
          }
        }}
      />
    </Card>
  );
}

function BudgetDialog({
  open,
  onOpenChange,
  budget,
  month,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget: Budget | null;
  month: string;
  onSaved: () => void;
}) {
  const t = useTranslations("Finance");
  const categoryLabel = useCategoryLabel();
  const { register, control, handleSubmit, reset, formState } = useForm<BudgetInput>({
    resolver: zodResolver(budgetSchema),
  });

  useEffect(() => {
    if (!open) return;
    reset(
      budget
        ? { category: budget.category as BudgetInput["category"], amount: budget.amount, month }
        : { category: EXPENSE_CATEGORIES[0], month }
    );
  }, [open, budget, month, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await sendJson("/api/finance/budgets", "POST", values);
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
          <DialogTitle>{budget ? t("editBudget") : t("addBudget")}</DialogTitle>
        </DialogHeader>
        <form id="budget-form" onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label>{t("category")}</Label>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select
                  value={field.value ?? null}
                  onValueChange={(v) => field.onChange(v)}
                  disabled={!!budget}
                  items={Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c, categoryLabel(c)]))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {categoryLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError message={formState.errors.category?.message} />
            {!budget && <p className="text-xs text-muted-foreground">{t("budgetReplaceHint")}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="budget-amount">{t("budgetAmount")}</Label>
            <Input
              id="budget-amount"
              type="number"
              inputMode="decimal"
              min={0}
              step="any"
              autoFocus
              aria-invalid={!!formState.errors.amount}
              {...register("amount", { valueAsNumber: true })}
            />
            <FieldError message={formState.errors.amount?.message} />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button type="submit" form="budget-form" disabled={formState.isSubmitting}>
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
