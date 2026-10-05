"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { FieldError, useFailureToast } from "@/components/common";
import { sendJson, useInvalidate } from "@/hooks/use-json";
import { bodyMetricSchema, type BodyMetricInput } from "@/lib/body-metrics";
import { todayKey } from "@/lib/date";

export function BodyMetricDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("Health");
  const tc = useTranslations("Common");
  const invalidate = useInvalidate();
  const onFail = useFailureToast();

  const { register, handleSubmit, reset, formState } = useForm<BodyMetricInput>({
    resolver: zodResolver(bodyMetricSchema),
  });

  useEffect(() => {
    if (open) {
      reset({ date: todayKey(Intl.DateTimeFormat().resolvedOptions().timeZone) });
    }
  }, [open, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await sendJson("/api/body", "POST", values);
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
          <DialogTitle>{t("logBody")}</DialogTitle>
        </DialogHeader>
        <form id="body-form" onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="body-date">{tc("date")}</Label>
            <Input id="body-date" type="date" aria-invalid={!!formState.errors.date} {...register("date")} />
            <FieldError message={formState.errors.date?.message} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="body-weight">{t("weight")} (kg)</Label>
              <Input
                id="body-weight"
                type="number"
                step="0.1"
                autoFocus
                aria-invalid={!!formState.errors.weight}
                {...register("weight", { valueAsNumber: true })}
              />
              <FieldError message={formState.errors.weight?.message} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="body-fat">{t("bodyFat")} (%)</Label>
              <Input
                id="body-fat"
                type="number"
                step="0.1"
                aria-invalid={!!formState.errors.bodyFat}
                {...register("bodyFat", { valueAsNumber: true })}
              />
              <FieldError message={formState.errors.bodyFat?.message} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="body-notes">{tc("notes")}</Label>
            <Textarea id="body-notes" aria-invalid={!!formState.errors.notes} {...register("notes")} />
            <FieldError message={formState.errors.notes?.message} />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button type="submit" form="body-form" disabled={formState.isSubmitting}>
            {tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
