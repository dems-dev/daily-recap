"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toast";
import { FieldError, useFailureToast } from "@/components/common";
import { sendJson, useInvalidate } from "@/hooks/use-json";
import { milestoneSchema, type MilestoneInput } from "@/lib/goals";

export function MilestoneDialog({
  open,
  onOpenChange,
  goalId,
  milestone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string;
  milestone?: { id: string; title: string } | null;
}) {
  const t = useTranslations("Productivity");
  const tc = useTranslations("Common");
  const invalidate = useInvalidate();
  const onFail = useFailureToast();

  const { register, handleSubmit, reset, formState } = useForm<MilestoneInput>({
    resolver: zodResolver(milestoneSchema),
  });

  useEffect(() => {
    if (open) reset({ title: milestone?.title ?? "" });
  }, [open, milestone, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (milestone) await sendJson(`/api/goals/${goalId}/milestones/${milestone.id}`, "PATCH", values);
      else await sendJson(`/api/goals/${goalId}/milestones`, "POST", values);
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
          <DialogTitle>{milestone ? t("editMilestone") : t("addMilestone")}</DialogTitle>
        </DialogHeader>
        <form id="milestone-form" onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="milestone-title">{t("milestoneTitle")}</Label>
            <Input id="milestone-title" autoFocus aria-invalid={!!formState.errors.title} {...register("title")} />
            <FieldError message={formState.errors.title?.message} />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button type="submit" form="milestone-form" disabled={formState.isSubmitting}>
            {tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
