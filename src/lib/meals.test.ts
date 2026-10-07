import { describe, expect, it } from "vitest";
import { mealSchema, serializeMeal } from "./meals";

const base = { type: "lunch" as const, name: "Ayam bakar", date: "2026-10-07" };

describe("mealSchema", () => {
  it("accepts a meal with optional macros", () => {
    expect(mealSchema.safeParse({ ...base, calories: 620, protein: 45, carbs: 70, fat: 18 }).success).toBe(true);
  });

  it("accepts a meal with only a name", () => {
    expect(mealSchema.safeParse(base).success).toBe(true);
  });

  it("rejects an empty name", () => {
    expect(mealSchema.safeParse({ ...base, name: "" }).success).toBe(false);
  });

  it("rejects an unknown meal type", () => {
    expect(mealSchema.safeParse({ ...base, type: "brunch" }).success).toBe(false);
  });

  it("rejects negative or non-integer calories", () => {
    expect(mealSchema.safeParse({ ...base, calories: -5 }).success).toBe(false);
    expect(mealSchema.safeParse({ ...base, calories: 12.5 }).success).toBe(false);
  });

  it("rejects an invalid date key", () => {
    expect(mealSchema.safeParse({ ...base, date: "2026-13-40" }).success).toBe(false);
  });
});

describe("serializeMeal", () => {
  it("maps a row to a DTO with a date key", () => {
    const dto = serializeMeal({
      id: "m1",
      type: "breakfast",
      name: "Oatmeal",
      calories: 300,
      protein: 10,
      carbs: 52,
      fat: 6,
      notes: null,
      date: new Date("2026-10-07T00:00:00.000Z"),
    });
    expect(dto).toMatchObject({ id: "m1", type: "breakfast", name: "Oatmeal", calories: 300, date: "2026-10-07" });
  });
});
