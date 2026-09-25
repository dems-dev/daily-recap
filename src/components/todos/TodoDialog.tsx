"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { ConfirmDialog, FieldError, useFailureToast } from "@/components/common";
import { sendJson, useInvalidate } from "@/hooks/use-json";
import { TODO_CATEGORIES, TODO_PRIORITIES, todoSchema, type TodoDTO, type TodoInput } from "@/lib/todos";

const NONE = "none";

export function TodoDialog({
  open,
  onOpenChange,
  todo,
  defaults,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Edit this task; omit to create a new one. */
  todo?: TodoDTO | null;
  defaults?: Partial<TodoInput>;
}) {
  const t = useTranslations("Todos");
  const tc = useTranslations("Common");
  const invalidate = useInvalidate();
  const onFail = useFailureToast();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { register, control, handleSubmit, reset, formState } = useForm<TodoInput>({
    resolver: zodResolver(todoSchema),
  });

  useEffect(() => {
    if (!open) return;
    reset(
      todo
        ? {
            title: todo.title,
            description: todo.description ?? "",
            priority: (todo.priority as TodoInput["priority"]) ?? null,
            category: (todo.category as TodoInput["category"]) ?? null,
            dueDate: todo.dueDate,
          }
        : { title: "", description: "", priority: null, category: null, dueDate: null, ...defaults }
    );
  }, [open, todo, defaults, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (todo) await sendJson(`/api/todos/${todo.id}`, "PATCH", values);
      else await sendJson("/api/todos", "POST", values);
      toast.add({ title: todo ? t("toast.updated") : t("toast.added"), type: "success" });
      onOpenChange(false);
      invalidate();
    } catch (err) {
      onFail(err);
    }
  });

  const optionSelect = (
    name: "priority" | "category",
    options: readonly string[],
    labelKey: "priority" | "category"
  ) => (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select
          value={field.value ?? NONE}
          onValueChange={(v) => field.onChange(v === NONE ? null : v)}
          items={{ [NONE]: tc("none"), ...Object.fromEntries(options.map((o) => [o, t(`${labelKey}.${o}`)])) }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>{tc("none")}</SelectItem>
            {options.map((o) => (
              <SelectItem key={o} value={o}>
                {t(`${labelKey}.${o}`)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{todo ? t("editTask") : t("addTask")}</DialogTitle>
          </DialogHeader>
          <form id="todo-form" onSubmit={onSubmit} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="todo-title">{t("title")}</Label>
              <Input id="todo-title" autoFocus aria-invalid={!!formState.errors.title} {...register("title")} />
              <FieldError message={formState.errors.title?.message} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="todo-due">{t("dueDate")}</Label>
                <Input
                  id="todo-due"
                  type="date"
                  {...register("dueDate", { setValueAs: (v: string | null) => v || null })}
                />
              </div>
              <div className="space-y-2">
                <Label>{t("priorityLabel")}</Label>
                {optionSelect("priority", TODO_PRIORITIES, "priority")}
              </div>
              <div className="space-y-2">
                <Label>{t("categoryLabel")}</Label>
                {optionSelect("category", TODO_CATEGORIES, "category")}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="todo-notes">{t("notes")}</Label>
              <Textarea id="todo-notes" rows={3} {...register("description")} />
              <FieldError message={formState.errors.description?.message} />
            </div>
          </form>
          <DialogFooter className="sm:justify-between">
            {todo ? (
              <Button variant="ghost" className="gap-1.5 text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 /> {tc("delete")}
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {tc("cancel")}
              </Button>
              <Button type="submit" form="todo-form" disabled={formState.isSubmitting}>
                {tc("save")}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t("deleteTitle")}
        description={todo?.title}
        onConfirm={async () => {
          if (!todo) return;
          try {
            await sendJson(`/api/todos/${todo.id}`, "DELETE");
            toast.add({ title: tc("deleted"), type: "success" });
            onOpenChange(false);
            invalidate();
          } catch (err) {
            onFail(err);
          }
        }}
      />
    </>
  );
}
