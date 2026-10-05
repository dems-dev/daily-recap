"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm, useWatch, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { FieldError, useFailureToast } from "@/components/common";
import { sendJson, useInvalidate } from "@/hooks/use-json";
import { goalSchema, goalPatchSchema, type GoalDTO, GOAL_CATEGORIES, GOAL_TYPES } from "@/lib/goals";

export function GoalDialog({
  open,
  onOpenChange,
  goal,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: GoalDTO | null;
}) {
  const t = useTranslations("Productivity");
  const tc = useTranslations("Common");
  const invalidate = useInvalidate();
  const onFail = useFailureToast();

  const schema = goal ? goalPatchSchema : goalSchema;
  type FormValues = Partial<GoalDTO>;

  const { register, control, handleSubmit, reset, setValue, formState } = useForm<FormValues>({
    resolver: zodResolver(schema as typeof goalSchema) as unknown as Resolver<FormValues>,
  });

  const category = useWatch({ control, name: "category" });
  const type = useWatch({ control, name: "type" });

  useEffect(() => {
    if (open) {
      reset(
        goal
          ? { ...goal, targetDate: goal.targetDate ?? undefined }
          : { title: "", description: "", category: "personal", type: "short-term", targetDate: undefined }
      );
    }
  }, [open, goal, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (goal) await sendJson(`/api/goals/${goal.id}`, "PATCH", values);
      else await sendJson("/api/goals", "POST", values);
      toast.add({ title: tc("saved"), type: "success" });
      onOpenChange(false);
      invalidate();
    } catch (err) {
      onFail(err);
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
            <Label htmlFor="goal-title">{t("goalTitle")}</Label>
            <Input id="goal-title" autoFocus aria-invalid={!!formState.errors.title} {...register("title")} />
            <FieldError message={formState.errors.title?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal-desc">{t("description")}</Label>
            <Textarea id="goal-desc" aria-invalid={!!formState.errors.description} {...register("description")} />
            <FieldError message={formState.errors.description?.message} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="goal-cat">{t("category")}</Label>
              <Select value={category} onValueChange={(val: string | null) => val && setValue("category", val as GoalDTO["category"])}>
                <SelectTrigger id="goal-cat">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={formState.errors.category?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-type">{t("type")}</Label>
              <Select value={type} onValueChange={(val: string | null) => val && setValue("type", val as GoalDTO["type"])}>
                <SelectTrigger id="goal-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">
                      {t.replace("-", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError message={formState.errors.type?.message} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="goal-date">{t("targetDate")}</Label>
            <Input id="goal-date" type="date" aria-invalid={!!formState.errors.targetDate} {...register("targetDate")} />
            <FieldError message={formState.errors.targetDate?.message} />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button type="submit" form="goal-form" disabled={formState.isSubmitting}>
            {tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
