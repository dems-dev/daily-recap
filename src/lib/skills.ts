import { z } from "zod";
import { isDateKey, type DateKey } from "@/lib/date";

export const SKILL_LEVELS = ["beginner", "intermediate", "advanced"] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

export const skillSchema = z.object({
  name: z.string().trim().min(1, "required").max(100, "tooLong"),
  category: z.string().trim().max(100).nullish(),
  level: z.enum(SKILL_LEVELS),
});

export type SkillInput = z.infer<typeof skillSchema>;

export const skillPatchSchema = skillSchema.partial();

export const skillSessionSchema = z.object({
  duration: z.number().int().min(1, "positive").max(600, "tooLarge"),
  notes: z.string().trim().max(1000, "tooLong").nullish(),
  date: z.string().refine(isDateKey, "invalidDate"),
});

export type SkillSessionInput = z.infer<typeof skillSessionSchema>;

export type SkillDTO = {
  id: string;
  name: string;
  category: string | null;
  level: SkillLevel;
  totalDuration: number;
};

export type SkillSessionDTO = {
  id: string;
  skillId: string;
  duration: number;
  notes: string | null;
  date: DateKey;
};
