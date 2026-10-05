import { z } from "zod";
import { isDateKey, type DateKey } from "@/lib/date";

export const POMODORO_CATEGORIES = ["work", "study", "side-project", "creative"] as const;
export type PomodoroCategory = (typeof POMODORO_CATEGORIES)[number];

export const pomodoroSchema = z.object({
  category: z.enum(POMODORO_CATEGORIES),
  label: z.string().trim().max(100, "tooLong").nullish(),
  duration: z.number().int().min(1, "positive").max(120, "tooLarge"),
  date: z.string().refine(isDateKey, "invalidDate"),
});
export type PomodoroInput = z.infer<typeof pomodoroSchema>;

export const pomodoroPatchSchema = pomodoroSchema.partial();

export type PomodoroDTO = {
  id: string;
  category: PomodoroCategory;
  label: string | null;
  duration: number;
  isCompleted: boolean;
  date: DateKey;
};

export type PomodoroStats = {
  today: { sessions: number; minutes: number };
  week: { sessions: number; minutes: number };
  byCategory: { category: string; minutes: number }[];
};

export function serializePomodoro(session: {
  id: string;
  category: string;
  label: string | null;
  duration: number;
  isCompleted: boolean;
  date: Date;
}): PomodoroDTO {
  return {
    id: session.id,
    category: session.category as PomodoroCategory,
    label: session.label,
    duration: session.duration,
    isCompleted: session.isCompleted,
    date: session.date.toISOString().slice(0, 10),
  };
}

/** Standard Pomodoro timer presets in minutes. */
export const TIMER_PRESETS = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
} as const;
