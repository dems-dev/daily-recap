import { z } from "zod";
import type { Journal } from "@prisma/client";
import { dateToKey } from "@/lib/date";

export const MOODS = ["great", "good", "okay", "bad", "terrible"] as const;
export type Mood = (typeof MOODS)[number];

/** 5 = great … 1 = terrible, for averages and insights. */
export const MOOD_SCORE: Record<Mood, number> = { great: 5, good: 4, okay: 3, bad: 2, terrible: 1 };

export function isMood(value: string): value is Mood {
  return (MOODS as readonly string[]).includes(value);
}

// Messages are translation keys under Common.errors.
export const journalSchema = z.object({
  mood: z.enum(MOODS, { errorMap: () => ({ message: "required" }) }),
  title: z.string().trim().max(120, "tooLong").nullish(),
  content: z.string().trim().max(20_000, "tooLong").default(""),
  gratitude: z.array(z.string().trim().max(200, "tooLong")).max(5).default([]),
  tags: z.array(z.string().trim().toLowerCase().min(1).max(30, "tooLong")).max(10).default([]),
});
export type JournalInput = z.input<typeof journalSchema>;

function parseList(json: unknown): string[] {
  if (!json) return [];
  try {
    const value = typeof json === "string" ? JSON.parse(json) : json;
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function serializeJournal(j: Journal) {
  return {
    date: dateToKey(j.date),
    mood: (isMood(j.mood) ? j.mood : "okay") as Mood,
    title: j.title,
    content: j.content,
    gratitude: parseList(j.gratitude),
    tags: parseList(j.tags),
    updatedAt: j.updatedAt.toISOString(),
  };
}
export type JournalDTO = ReturnType<typeof serializeJournal>;
