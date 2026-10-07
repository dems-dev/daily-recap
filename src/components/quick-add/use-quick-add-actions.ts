"use client";

import { useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useCategoryLabel, useMoney } from "@/components/finance/shared";
import { previewDuration } from "@/components/sleep/SleepForm";
import { sendJson } from "@/hooks/use-json";
import type { JournalDTO } from "@/lib/journal";
import { matchHabit, type QuickAdd } from "@/lib/quick-add";
import { formatDuration } from "@/lib/sleep";

type HabitRef = { id: string; name: string };

/**
 * Describe and execute quick-add commands. Shared by the Ctrl+K palette and the
 * AI "tell me about your day" review, so both save entries the same way.
 */
export function useQuickAddActions({
  today,
  habits,
  currency,
}: {
  today: string | null;
  habits: HabitRef[];
  currency: string | undefined;
}) {
  const t = useTranslations("QuickAdd");
  const locale = useLocale();
  const money = useMoney(currency);
  const categoryLabel = useCategoryLabel();

  const describe = useCallback(
    (q: QuickAdd) => {
      switch (q.kind) {
        case "expense":
        case "income":
          return t(q.kind === "expense" ? "previewExpense" : "previewIncome", {
            amount: money(q.amount),
            category: categoryLabel(q.category),
            description: q.description || "-",
            when: q.date === today ? t("today") : q.date,
          });
        case "todo":
          return t("previewTodo", { title: q.title, when: q.dueDate ?? t("noDate") });
        case "habit": {
          const match = matchHabit(habits, q.query);
          return match ? t("previewHabit", { name: match.name }) : t("habitNotFound", { query: q.query });
        }
        case "mood":
          return q.note ? t("previewMoodNote", { mood: t(`moods.${q.mood}`), note: q.note }) : t("previewMood", { mood: t(`moods.${q.mood}`) });
        case "sleep": {
          const minutes = previewDuration(q.bedtime, q.wakeTime);
          return t("previewSleep", {
            bedtime: q.bedtime,
            wakeTime: q.wakeTime,
            duration: minutes === null ? "-" : formatDuration(minutes, locale),
          });
        }
        case "wish":
          return t("previewWish", { name: q.name, price: money(q.price), category: categoryLabel(q.category) });
        case "priority":
          return t("previewPriority", { title: q.title });
      }
    },
    [t, money, categoryLabel, today, habits, locale]
  );

  /** Saves one command; resolves with a success message, throws on failure. */
  const execute = useCallback(
    async (q: QuickAdd): Promise<string> => {
      if (!today) throw new Error("Not ready");
      switch (q.kind) {
        case "expense":
        case "income":
          await sendJson("/api/finance", "POST", {
            type: q.kind,
            amount: q.amount,
            category: q.category,
            description: q.description,
            date: q.date,
          });
          return t("doneMoney", { amount: money(q.amount) });
        case "todo":
          await sendJson("/api/todos", "POST", { title: q.title, dueDate: q.dueDate });
          return t("doneTodo", { title: q.title });
        case "habit": {
          const match = matchHabit(habits, q.query);
          if (!match) throw new Error(t("habitNotFound", { query: q.query }));
          await sendJson(`/api/habits/${match.id}/logs`, "PUT", { date: today, completed: true });
          return t("doneHabit", { name: match.name });
        }
        case "mood": {
          // Keep the rest of today's entry; append the note to the reflection.
          const res = await fetch(`/api/journal/${today}`).then((r) => r.json());
          const entry: JournalDTO | null = res.entry;
          const content = [entry?.content, q.note].filter(Boolean).join("\n");
          await sendJson(`/api/journal/${today}`, "PUT", {
            mood: q.mood,
            title: entry?.title ?? null,
            content,
            gratitude: entry?.gratitude ?? [],
            tags: entry?.tags ?? [],
          });
          return t("doneMood");
        }
        case "sleep": {
          // Quality defaults to "okay"; it can be adjusted on the Sleep page.
          const res = (await sendJson(`/api/sleep/${today}`, "PUT", {
            bedtime: q.bedtime,
            wakeTime: q.wakeTime,
            quality: 3,
          })) as { duration: number };
          return t("doneSleep", { duration: formatDuration(res.duration, locale) });
        }
        case "wish":
          await sendJson("/api/wishlist", "POST", { name: q.name, price: q.price, category: q.category });
          return t("doneWish", { name: q.name });
        case "priority":
          await sendJson("/api/plans", "POST", { date: today, title: q.title });
          return t("donePriority", { title: q.title });
      }
    },
    [today, habits, t, money, locale]
  );

  return { describe, execute };
}
