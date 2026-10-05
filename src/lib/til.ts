import { z } from "zod";
import type { TilNote } from "@prisma/client";
import { isDateKey, type DateKey, dateToKey } from "@/lib/date";

export const tilSchema = z.object({
  content: z.string().trim().min(1, "required").max(2000, "tooLong"),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  source: z.string().trim().max(200, "tooLong").nullish(),
  date: z.string().refine(isDateKey, "invalidDate"),
});
export type TilInput = z.infer<typeof tilSchema>;

export const tilPatchSchema = tilSchema.partial();

export type TilDTO = {
  id: string;
  content: string;
  tags: string[];
  source: string | null;
  date: DateKey;
};

/** `tags` is a `Json?` column; tolerate a raw array or a stringified one (same as journal). */
function parseTags(json: unknown): string[] {
  if (!json) return [];
  try {
    const value = typeof json === "string" ? JSON.parse(json) : json;
    return Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

export function serializeTil(note: TilNote): TilDTO {
  return {
    id: note.id,
    content: note.content,
    tags: parseTags(note.tags),
    source: note.source,
    date: dateToKey(note.date),
  };
}
