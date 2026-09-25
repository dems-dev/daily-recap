"use client";

import { useCallback } from "react";
import { useTranslations } from "next-intl";
import { toast } from "@/components/ui/toast";
import { useFailureToast } from "@/components/common";
import { sendJson, useInvalidate } from "@/hooks/use-json";
import type { TodoDTO } from "@/lib/todos";

export function useToggleTodo() {
  const t = useTranslations("Todos");
  const invalidate = useInvalidate();
  const onFail = useFailureToast();

  return useCallback(
    async (todo: TodoDTO, done: boolean) => {
      try {
        await sendJson(`/api/todos/${todo.id}`, "PATCH", { isCompleted: done });
        if (done) toast.add({ title: t("toast.completed", { title: todo.title }), type: "success" });
        invalidate();
      } catch (err) {
        onFail(err);
      }
    },
    [t, invalidate, onFail]
  );
}
