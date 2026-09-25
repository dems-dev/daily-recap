import { z } from "zod";
import type { Prisma, Todo } from "@prisma/client";
import { dateToKey, isDateKey } from "@/lib/date";

export const TODO_PRIORITIES = ["high", "medium", "low"] as const;
export const TODO_CATEGORIES = ["work", "personal", "errands", "study"] as const;

// Messages are translation keys under Todos.errors.
export const todoSchema = z.object({
  title: z.string().trim().min(1, "required").max(200, "tooLong"),
  description: z.string().trim().max(2000, "tooLong").nullish(),
  priority: z.enum(TODO_PRIORITIES).nullish(),
  category: z.enum(TODO_CATEGORIES).nullish(),
  dueDate: z.string().refine(isDateKey, "invalidDate").nullish(),
});
export type TodoInput = z.infer<typeof todoSchema>;

export const todoPatchSchema = todoSchema.partial().extend({
  isCompleted: z.boolean().optional(),
});

export const TODO_VIEWS = ["today", "upcoming", "completed", "all"] as const;
export type TodoView = (typeof TODO_VIEWS)[number];

/**
 * "Today" list: open tasks that are undated or due by today, plus tasks completed today.
 * `today` is the stored calendar date, `bounds` the instants of the user's local day.
 */
export function todayTodosWhere(
  userId: string,
  today: Date,
  bounds: { start: Date; end: Date }
): Prisma.TodoWhereInput {
  return {
    userId,
    OR: [
      { isCompleted: false, OR: [{ dueDate: null }, { dueDate: { lte: today } }] },
      { isCompleted: true, completedAt: { gte: bounds.start, lt: bounds.end } },
    ],
  };
}

const PRIORITY_RANK: Record<string, number> = { high: 0, medium: 1, low: 2 };

/** Open before done; then overdue/earliest due first; then priority; then newest. */
export function compareTodos(
  a: { isCompleted: boolean; dueDate: string | null; priority: string | null; createdAt: string },
  b: typeof a
) {
  if (a.isCompleted !== b.isCompleted) return a.isCompleted ? 1 : -1;
  if (a.dueDate !== b.dueDate) {
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate < b.dueDate ? -1 : 1;
  }
  const pa = PRIORITY_RANK[a.priority ?? ""] ?? 3;
  const pb = PRIORITY_RANK[b.priority ?? ""] ?? 3;
  if (pa !== pb) return pa - pb;
  return a.createdAt < b.createdAt ? 1 : -1;
}

export type TodoDTO = ReturnType<typeof serializeTodo>;

export function serializeTodo(t: Todo) {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    priority: t.priority,
    category: t.category,
    isCompleted: t.isCompleted,
    completedAt: t.completedAt?.toISOString() ?? null,
    dueDate: t.dueDate ? dateToKey(t.dueDate) : null,
    createdAt: t.createdAt.toISOString(),
  };
}
