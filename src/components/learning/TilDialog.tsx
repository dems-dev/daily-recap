"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useForm, type Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import { FieldError, useFailureToast } from "@/components/common";
import { sendJson, useInvalidate } from "@/hooks/use-json";
import { tilSchema, type TilInput, type TilDTO } from "@/lib/til";
import { todayKey } from "@/lib/date";

export function TilDialog({
  open,
  onOpenChange,
  note,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note?: TilDTO | null;
}) {
  const t = useTranslations("Learning");
  const tc = useTranslations("Common");
  const invalidate = useInvalidate();
  const onFail = useFailureToast();

  type FormValues = TilInput & { tagsString: string };
  const { register, handleSubmit, reset, formState } = useForm<FormValues>({
    // The form carries an extra UI-only `tagsString` field, so the schema resolver is cast to match.
    resolver: zodResolver(tilSchema) as unknown as Resolver<FormValues>,
  });

  useEffect(() => {
    if (open) {
      reset(
        note
          ? {
              content: note.content,
              tags: note.tags,
              tagsString: note.tags.join(", "),
              source: note.source ?? "",
              date: note.date,
            }
          : {
              content: "",
              tags: [],
              tagsString: "",
              source: "",
              date: todayKey(Intl.DateTimeFormat().resolvedOptions().timeZone),
            }
      );
    }
  }, [open, note, reset]);

  const onSubmit = handleSubmit(
    async (values) => {
      try {
        if (note) await sendJson(`/api/til/${note.id}`, "PATCH", values);
        else await sendJson("/api/til", "POST", values);
        toast.add({ title: tc("saved"), type: "success" });
        onOpenChange(false);
        invalidate();
      } catch (err) {
        onFail(err);
      }
    },
    // Intercept submit to format tags string to array
    (errors, e) => {
      e?.preventDefault();
      const form = e?.target as HTMLFormElement;
      const tagsStr = (form.elements.namedItem("tagsString") as HTMLInputElement).value;
      const tags = tagsStr
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      handleSubmit(async (v) => {
        try {
          const payload = { ...v, tags };
          if (note) await sendJson(`/api/til/${note.id}`, "PATCH", payload);
          else await sendJson("/api/til", "POST", payload);
          toast.add({ title: tc("saved"), type: "success" });
          onOpenChange(false);
          invalidate();
        } catch (err) {
          onFail(err);
        }
      })();
    }
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{note ? t("editTil") : t("addTil")}</DialogTitle>
        </DialogHeader>
        <form id="til-form" onSubmit={onSubmit} className="space-y-4" noValidate>
          <div className="space-y-2">
            <Label htmlFor="til-content">{t("content")}</Label>
            <Textarea
              id="til-content"
              autoFocus
              className="min-h-[100px]"
              aria-invalid={!!formState.errors.content}
              {...register("content")}
            />
            <FieldError message={formState.errors.content?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="til-tags">{t("tags")}</Label>
            <Input
              id="til-tags"
              placeholder="react, typescript, css..."
              aria-invalid={!!formState.errors.tags}
              {...register("tagsString")}
            />
            <FieldError message={formState.errors.tags?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="til-source">{t("sourceUrl")}</Label>
            <Input
              id="til-source"
              type="url"
              placeholder="https://..."
              aria-invalid={!!formState.errors.source}
              {...register("source")}
            />
            <FieldError message={formState.errors.source?.message} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="til-date">{t("date")}</Label>
            <Input
              id="til-date"
              type="date"
              aria-invalid={!!formState.errors.date}
              {...register("date")}
            />
            <FieldError message={formState.errors.date?.message} />
          </div>
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button type="submit" form="til-form" disabled={formState.isSubmitting}>
            {tc("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
