import { z } from "zod";
import { isDateKey, type DateKey } from "@/lib/date";

export const waterLogSchema = z.object({
  date: z.string().refine(isDateKey, "invalidDate"),
  glasses: z.number().int().min(0, "positive").max(30, "tooLarge"),
  target: z.number().int().min(1, "positive").max(30, "tooLarge").optional(),
});
export type WaterLogInput = z.infer<typeof waterLogSchema>;

export type WaterLogDTO = {
  date: DateKey;
  glasses: number;
  target: number;
};
