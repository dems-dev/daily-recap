import { z } from "zod";
import { isDateKey, isMonthKey } from "@/lib/date";

// Stored as keys; labels live in messages/*.json under Finance.categories.
export const INCOME_CATEGORIES = ["salary", "freelance", "business", "investment", "gift", "other-income"] as const;
export const EXPENSE_CATEGORIES = [
  "food",
  "transport",
  "shopping",
  "bills",
  "entertainment",
  "health",
  "education",
  "family",
  "other-expense",
] as const;

export type TransactionType = "income" | "expense";

export function categoriesFor(type: TransactionType): readonly string[] {
  return type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

// Messages are translation keys under Finance.errors.
const amount = z
  .number({ required_error: "required", invalid_type_error: "required" })
  .positive("positive")
  .max(1_000_000_000_000, "tooLarge");
const dateKey = z.string().refine(isDateKey, "invalidDate");
export const monthKeySchema = z.string().refine(isMonthKey, "invalidMonth");

export const transactionSchema = z
  .object({
    type: z.enum(["income", "expense"]),
    amount,
    category: z.string().min(1, "required"),
    description: z.string().trim().max(200, "tooLong").optional(),
    date: dateKey,
  })
  .refine((v) => categoriesFor(v.type).includes(v.category), {
    message: "invalidCategory",
    path: ["category"],
  });
export type TransactionInput = z.infer<typeof transactionSchema>;

export const budgetSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES, { errorMap: () => ({ message: "invalidCategory" }) }),
  amount,
  month: monthKeySchema,
});
export type BudgetInput = z.infer<typeof budgetSchema>;

export const savingsGoalSchema = z.object({
  name: z.string().trim().min(1, "required").max(80, "tooLong"),
  targetAmount: amount,
  deadline: dateKey.nullable().optional(),
});
export type SavingsGoalInput = z.infer<typeof savingsGoalSchema>;

/** Deposit (positive) or withdrawal (negative) against a savings goal. */
export const savingsDepositSchema = z.object({
  deposit: z
    .number({ required_error: "required", invalid_type_error: "required" })
    .refine((n) => n !== 0, "nonZero")
    .refine((n) => Math.abs(n) <= 1_000_000_000_000, "tooLarge"),
});
