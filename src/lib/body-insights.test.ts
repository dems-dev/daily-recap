import { describe, expect, it } from "vitest";
import {
  bmi,
  bmiCategory,
  goalForCategory,
  idealWeightRange,
  bmr,
  tdee,
  targetCalories,
  macros,
  ageFromBirthYear,
  ACTIVITY_FACTORS,
} from "./body-insights";

describe("bmi", () => {
  it("computes weight / height²", () => {
    expect(bmi(80, 178)).toBeCloseTo(25.25, 1);
    expect(bmi(60, 170)).toBeCloseTo(20.76, 1);
  });
});

describe("bmiCategory", () => {
  it("classifies on the standard WHO cut-offs", () => {
    expect(bmiCategory(18.4)).toBe("underweight");
    expect(bmiCategory(18.5)).toBe("normal");
    expect(bmiCategory(24.9)).toBe("normal");
    expect(bmiCategory(25)).toBe("overweight");
    expect(bmiCategory(29.9)).toBe("overweight");
    expect(bmiCategory(30)).toBe("obese");
  });
});

describe("goalForCategory", () => {
  it("maps a category to a recommendation goal", () => {
    expect(goalForCategory("underweight")).toBe("gain");
    expect(goalForCategory("normal")).toBe("maintain");
    expect(goalForCategory("overweight")).toBe("lose");
    expect(goalForCategory("obese")).toBe("lose");
  });
});

describe("idealWeightRange", () => {
  it("uses BMI 18.5–24.9 for the height", () => {
    const r = idealWeightRange(178);
    expect(r.min).toBeCloseTo(58.6, 1);
    expect(r.max).toBeCloseTo(78.9, 1);
    expect(r.min).toBeLessThan(r.max);
  });
});

describe("bmr (Mifflin–St Jeor)", () => {
  it("adds 5 for males, subtracts 161 for females", () => {
    expect(bmr("male", 80, 178, 30)).toBeCloseTo(1767.5, 1);
    expect(bmr("female", 80, 178, 30)).toBeCloseTo(1601.5, 1);
    // The only difference between the sexes is the +5 / −161 constant (166 apart).
    expect(bmr("male", 80, 178, 30) - bmr("female", 80, 178, 30)).toBeCloseTo(166, 1);
  });
});

describe("tdee", () => {
  it("multiplies BMR by the activity factor", () => {
    expect(tdee(1767.5, "moderate")).toBeCloseTo(1767.5 * ACTIVITY_FACTORS.moderate, 1);
    expect(tdee(1767.5, "sedentary")).toBeLessThan(tdee(1767.5, "veryActive"));
  });
});

describe("targetCalories", () => {
  it("applies a deficit, surplus, or maintenance", () => {
    expect(targetCalories(2700, "lose")).toBe(2200);
    expect(targetCalories(2700, "gain")).toBe(3000);
    expect(targetCalories(2700, "maintain")).toBe(2700);
  });
  it("never goes below a 1200 floor when losing", () => {
    expect(targetCalories(1500, "lose")).toBe(1200);
  });
});

describe("macros", () => {
  it("is protein-forward and roughly adds up to the calorie target", () => {
    const m = macros(2000, 80);
    expect(m.protein).toBe(144); // 1.8 g/kg
    expect(m.fat).toBe(56); // 25% of kcal
    expect(m.carbs).toBe(230);
    const kcal = m.protein * 4 + m.carbs * 4 + m.fat * 9;
    expect(Math.abs(kcal - 2000)).toBeLessThanOrEqual(10);
  });
  it("never returns negative carbs", () => {
    expect(macros(800, 120).carbs).toBeGreaterThanOrEqual(0);
  });
});

describe("ageFromBirthYear", () => {
  it("is the whole-year difference", () => {
    expect(ageFromBirthYear(1996, new Date("2026-10-07T00:00:00Z"))).toBe(30);
    expect(ageFromBirthYear(2030, new Date("2026-10-07T00:00:00Z"))).toBe(0); // clamped
  });
});
