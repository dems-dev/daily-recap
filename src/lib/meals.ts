import { z } from "zod";
import { isDateKey, type DateKey, dateToKey } from "@/lib/date";

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealType = (typeof MEAL_TYPES)[number];

export const mealSchema = z.object({
  type: z.enum(MEAL_TYPES),
  name: z.string().trim().min(1, "required").max(120, "tooLong"),
  calories: z.number().int().min(0, "positive").max(10000, "tooLarge").nullish(),
  protein: z.number().min(0, "positive").max(2000, "tooLarge").nullish(),
  carbs: z.number().min(0, "positive").max(2000, "tooLarge").nullish(),
  fat: z.number().min(0, "positive").max(2000, "tooLarge").nullish(),
  notes: z.string().trim().max(500, "tooLong").nullish(),
  date: z.string().refine(isDateKey, "invalidDate"),
});
export type MealInput = z.infer<typeof mealSchema>;

export type MealDTO = {
  id: string;
  type: MealType;
  name: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  notes: string | null;
  date: DateKey;
};

export function serializeMeal(row: {
  id: string;
  type: string;
  name: string;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  notes: string | null;
  date: Date;
}): MealDTO {
  return {
    id: row.id,
    type: row.type as MealType,
    name: row.name,
    calories: row.calories,
    protein: row.protein,
    carbs: row.carbs,
    fat: row.fat,
    notes: row.notes,
    date: dateToKey(row.date),
  };
}
