import { z } from "zod";
import { isDateKey, type DateKey } from "@/lib/date";

export const bodyMetricSchema = z.object({
  date: z.string().refine(isDateKey, "invalidDate"),
  weight: z.number().min(20, "positive").max(500, "tooLarge").nullish(),
  bodyFat: z.number().min(1, "positive").max(80, "tooLarge").nullish(),
  height: z.number().min(50, "positive").max(300, "tooLarge").nullish(),
  notes: z.string().trim().max(500, "tooLong").nullish(),
});
export type BodyMetricInput = z.infer<typeof bodyMetricSchema>;

export type BodyMetricDTO = {
  id: string;
  date: DateKey;
  weight: number | null;
  bodyFat: number | null;
  height: number | null;
  notes: string | null;
};

export function serializeBodyMetric(row: {
  id: string;
  date: Date;
  weight: number | null;
  bodyFat: number | null;
  height: number | null;
  notes: string | null;
}): BodyMetricDTO {
  return {
    id: row.id,
    date: row.date.toISOString().slice(0, 10),
    weight: row.weight,
    bodyFat: row.bodyFat,
    height: row.height,
    notes: row.notes,
  };
}
