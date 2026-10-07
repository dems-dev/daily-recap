/**
 * Body-composition math for the Body Metrics page. Pure functions, no I/O.
 * These are general wellness estimates (BMI, Mifflin–St Jeor BMR/TDEE), not
 * medical advice - the UI shows a disclaimer.
 */

export type Sex = "male" | "female";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "veryActive";
export type BmiCategory = "underweight" | "normal" | "overweight" | "obese";
/** The recommendation set to show - derived from BMI category. */
export type Goal = "gain" | "maintain" | "lose";

export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9,
};

export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100;
  return weightKg / (m * m);
}

export function bmiCategory(value: number): BmiCategory {
  if (value < 18.5) return "underweight";
  if (value < 25) return "normal";
  if (value < 30) return "overweight";
  return "obese";
}

export function goalForCategory(category: BmiCategory): Goal {
  if (category === "underweight") return "gain";
  if (category === "normal") return "maintain";
  return "lose";
}

/** Healthy weight range for a height, using BMI 18.5–24.9. */
export function idealWeightRange(heightCm: number): { min: number; max: number } {
  const m = heightCm / 100;
  return { min: 18.5 * m * m, max: 24.9 * m * m };
}

/** Mifflin–St Jeor basal metabolic rate (kcal/day). */
export function bmr(sex: Sex, weightKg: number, heightCm: number, age: number): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  return sex === "male" ? base + 5 : base - 161;
}

export function tdee(bmrValue: number, activity: ActivityLevel): number {
  return bmrValue * ACTIVITY_FACTORS[activity];
}

/**
 * Daily calorie target. A ~500 kcal deficit (lose) or ~300 surplus (gain) is a
 * safe pace of roughly 0.3–0.5 kg per week; maintenance otherwise.
 */
export function targetCalories(tdeeValue: number, goal: Goal): number {
  if (goal === "lose") return Math.max(1200, tdeeValue - 500);
  if (goal === "gain") return tdeeValue + 300;
  return tdeeValue;
}

/** A simple, protein-forward macro split from a calorie target + bodyweight. */
export function macros(calories: number, weightKg: number) {
  const protein = Math.round(1.8 * weightKg); // g
  const fat = Math.round((calories * 0.25) / 9); // 25% of kcal
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { protein, carbs, fat };
}

export function ageFromBirthYear(birthYear: number, now = new Date()): number {
  return Math.max(0, now.getFullYear() - birthYear);
}
