"use client";

import { useCallback, useState } from "react";
import { useFailureToast } from "@/components/common";
import { sendJson, useInvalidate } from "@/hooks/use-json";

/**
 * Toggle a habit for a day. Returns an optimistic override map
 * (`"habitId|date" -> done`) so the grid updates before the refetch lands.
 */
export function useToggleHabit() {
  const invalidate = useInvalidate();
  const onFail = useFailureToast();
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const toggle = useCallback(
    async (habitId: string, date: string, completed: boolean) => {
      const key = `${habitId}|${date}`;
      setPending((p) => ({ ...p, [key]: completed }));
      try {
        await sendJson(`/api/habits/${habitId}/logs`, "PUT", { date, completed });
        invalidate();
      } catch (err) {
        onFail(err);
      } finally {
        setPending((p) => {
          const next = { ...p };
          delete next[key];
          return next;
        });
      }
    },
    [invalidate, onFail]
  );

  const isDone = useCallback(
    (habitId: string, date: string, serverValue: boolean) => pending[`${habitId}|${date}`] ?? serverValue,
    [pending]
  );

  return { toggle, isDone };
}
