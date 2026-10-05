import { z } from "zod";
import { isDateKey, type DateKey, dateToKey } from "@/lib/date";

export const MEDITATION_TYPES = ["guided", "breathing", "silent", "yoga", "body-scan"] as const;
export type MeditationType = (typeof MEDITATION_TYPES)[number];

export const meditationSchema = z.object({
  type: z.enum(MEDITATION_TYPES),
  notes: z.string().trim().max(500, "tooLong").nullish(),
  duration: z.number().int().min(1, "positive").max(180, "tooLarge"),
  date: z.string().refine(isDateKey, "invalidDate"),
});

export type MeditationInput = z.infer<typeof meditationSchema>;

export const meditationPatchSchema = meditationSchema.partial();

export type MeditationDTO = {
  id: string;
  type: MeditationType;
  duration: number;
  notes: string | null;
  date: DateKey;
};

export function serializeMeditation(log: {
  id: string;
  type: string;
  duration: number;
  notes: string | null;
  date: Date;
}): MeditationDTO {
  return {
    id: log.id,
    type: log.type as MeditationType,
    duration: log.duration,
    notes: log.notes,
    date: dateToKey(log.date),
  };
}
