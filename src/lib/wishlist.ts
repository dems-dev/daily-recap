import { z } from "zod";
import { EXPENSE_CATEGORIES } from "@/lib/finance";

export const DEFAULT_WAIT_DAYS = 7;

// Messages are translation keys under Finance.errors / Common.errors.
export const wishlistSchema = z.object({
  name: z.string().trim().min(1, "required").max(120, "tooLong"),
  price: z
    .number({ required_error: "required", invalid_type_error: "required" })
    .positive("positive")
    .max(1_000_000_000_000, "tooLarge"),
  category: z.enum(EXPENSE_CATEGORIES, { errorMap: () => ({ message: "invalidCategory" }) }),
  url: z.string().trim().url("invalidUrl").max(2048).nullish().or(z.literal("")),
  note: z.string().trim().max(500, "tooLong").nullish(),
  waitDays: z.number().int().min(1).max(90).default(DEFAULT_WAIT_DAYS),
});
export type WishlistInput = z.input<typeof wishlistSchema>;

export const decisionSchema = z.object({ decision: z.enum(["bought", "skipped"]) });
