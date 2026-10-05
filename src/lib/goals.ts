import { z } from "zod";
import { isDateKey, type DateKey } from "@/lib/date";

export const GOAL_CATEGORIES = [
  "health",
  "finance",
  "career",
  "personal",
  "learning",
  "relationships",
] as const;
export type GoalCategory = (typeof GOAL_CATEGORIES)[number];

export const GOAL_TYPES = ["short-term", "long-term"] as const;
export type GoalType = (typeof GOAL_TYPES)[number];

export const goalSchema = z.object({
  title: z.string().trim().min(1, "required").max(200, "tooLong"),
  description: z.string().trim().max(2000, "tooLong").nullish(),
  category: z.enum(GOAL_CATEGORIES),
  type: z.enum(GOAL_TYPES),
  targetDate: z.string().refine(isDateKey, "invalidDate").nullish(),
});
export type GoalInput = z.infer<typeof goalSchema>;

export const goalPatchSchema = goalSchema.partial().extend({
  isCompleted: z.boolean().optional(),
});

export const milestoneSchema = z.object({
  title: z.string().trim().min(1, "required").max(200, "tooLong"),
});
export type MilestoneInput = z.infer<typeof milestoneSchema>;

export type MilestoneDTO = {
  id: string;
  title: string;
  isCompleted: boolean;
  order: number | null;
};

export type GoalDTO = {
  id: string;
  title: string;
  description: string | null;
  category: GoalCategory;
  type: GoalType;
  targetDate: DateKey | null;
  isCompleted: boolean;
  milestones: MilestoneDTO[];
  progress: number; // 0-1
};

export function serializeGoal(goal: {
  id: string;
  title: string;
  description: string | null;
  category: string;
  type: string;
  targetDate: Date | null;
  isCompleted: boolean;
  milestones: {
    id: string;
    title: string;
    isCompleted: boolean;
    order: number | null;
  }[];
}): GoalDTO {
  const total = goal.milestones.length;
  const done = goal.milestones.filter((m) => m.isCompleted).length;
  return {
    id: goal.id,
    title: goal.title,
    description: goal.description,
    category: goal.category as GoalCategory,
    type: goal.type as GoalType,
    targetDate: goal.targetDate?.toISOString().slice(0, 10) ?? null,
    isCompleted: goal.isCompleted,
    milestones: goal.milestones
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((m) => ({ id: m.id, title: m.title, isCompleted: m.isCompleted, order: m.order })),
    progress: total === 0 ? (goal.isCompleted ? 1 : 0) : done / total,
  };
}
