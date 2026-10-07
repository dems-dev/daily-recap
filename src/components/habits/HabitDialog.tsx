"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { FieldError, useFailureToast } from "@/components/common";
import { sendJson, useInvalidate } from "@/hooks/use-json";
import { habitSchema, type HabitInput } from "@/lib/habits";
import { cn } from "@/lib/utils";
import type { HabitDTO } from "./habit-types";
import { HABIT_ICON_KEYS, HabitIcon } from "./HabitIcon";

const ICONS = HABIT_ICON_KEYS;

export function HabitDialog({
  open,
  onOpenChange,
  habit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habit?: HabitDTO | null;
}) {
  const t = useTranslations("Habits");
  const tc = useTranslations("Common");
  const invalidate = useInvalidate();
  const onFail = useFailureToast();
  const { register, control, handleSubmit, reset, setValue, formState } = useForm<HabitInput>({
    resolver: zodResolver(habitSchema),
  });
  const icon = useWatch({ control, name: "icon" });

  useEffect(() => {
    if (open) reset(habit ? { name: habit.name, icon: habit.icon } : { name: "", icon: ICONS[0] });
  }, [open, habit, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (habit) await sendJson(`/api/habits/${habit.id}`, "PATCH", values);
      else await sendJson("/api/habits", "POST", values);
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
          <DialogTitle>{habit ? t("editHabit") : t("addHabit")}</DialogTitle>
        </DialogHeader>
        <form id="habit-form" onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="habit-name">{t("name")}</Label>
            <Input
              id="habit-name"
              autoFocus
              placeholder={t("namePlaceholder")}
              aria-invalid={!!formState.errors.name}
              {...register("name")}
            />
            <FieldError message={formState.errors.name?.message} />
          </div>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{t("icon")}</legend>
            <div className="flex flex-wrap gap-1.5">
              {ICONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  aria-pressed={icon === option}
                  onClick={() => setValue("icon", option)}
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg border transition-colors",
                    icon === option ? "border-primary bg-primary/10 text-primary" : "border-transparent text-muted-foreground hover:bg-muted"
                  )}
                >
                  <HabitIcon icon={option} className="size-5" />
                </button>
              ))}
            </div>
          </fieldset>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button type="submit" form="habit-form" disabled={formState.isSubmitting}>
            {tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
