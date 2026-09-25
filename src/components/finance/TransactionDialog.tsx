"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { sendJson } from "@/hooks/use-json";
import { categoriesFor, transactionSchema, type TransactionInput, type TransactionType } from "@/lib/finance";
import { cn } from "@/lib/utils";
import { FieldError, useCategoryLabel } from "./shared";

export type Transaction = TransactionInput & { id: string; description: string | null };

export function TransactionDialog({
  open,
  onOpenChange,
  transaction,
  defaultDate,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit this transaction; omit to create a new one. */
  transaction?: Transaction | null;
  defaultDate: string;
  onSaved: () => void;
}) {
  const t = useTranslations("Finance");
  const categoryLabel = useCategoryLabel();

  const form = useForm<TransactionInput>({
    resolver: zodResolver(transactionSchema),
  });
  const { register, control, handleSubmit, reset, setValue, formState } = form;
  const type = useWatch({ control, name: "type" });

  useEffect(() => {
    if (!open) return;
    reset(
      transaction
        ? { ...transaction, description: transaction.description ?? "" }
        : { type: "expense", category: categoriesFor("expense")[0], description: "", date: defaultDate }
    );
  }, [open, transaction, defaultDate, reset]);

  const setType = (next: TransactionType) => {
    if (next === type) return;
    setValue("type", next);
    setValue("category", categoriesFor(next)[0], { shouldValidate: formState.isSubmitted });
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (transaction) await sendJson(`/api/finance/${transaction.id}`, "PUT", values);
      else await sendJson("/api/finance", "POST", values);
      toast.add({ title: transaction ? t("toast.updated") : t("toast.added"), type: "success" });
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.add({ title: t("toast.failed"), description: String((err as Error).message), type: "error" });
    }
  });

  const categories = categoriesFor(type ?? "expense");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{transaction ? t("editTransaction") : t("addTransaction")}</DialogTitle>
        </DialogHeader>

        <form id="transaction-form" onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="radiogroup" aria-label={t("type")}>
            {(["expense", "income"] as const).map((option) => (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={type === option}
                onClick={() => setType(option)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  type === option ? "bg-background shadow-sm" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {t(option)}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tx-amount">{t("amount")}</Label>
            <Input
              id="tx-amount"
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("category")}</Label>
              <Controller
                control={control}
                name="category"
                render={({ field }) => (
                  <Select
                    value={field.value ?? null}
                    onValueChange={(v) => field.onChange(v)}
                    items={Object.fromEntries(categories.map((c) => [c, categoryLabel(c)]))}
                  >
                    <SelectTrigger className="w-full" aria-invalid={!!formState.errors.category}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c} value={c}>
                          {categoryLabel(c)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={formState.errors.category?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tx-date">{t("date")}</Label>
              <Input id="tx-date" type="date" aria-invalid={!!formState.errors.date} {...register("date")} />
              <FieldError message={formState.errors.date?.message} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tx-description">{t("description")}</Label>
            <Input id="tx-description" placeholder={t("descriptionPlaceholder")} {...register("description")} />
            <FieldError message={formState.errors.description?.message} />
          </div>
        </form>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button type="submit" form="transaction-form" disabled={formState.isSubmitting}>
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
