import { z } from "zod";
import { isValidTimezone } from "@/lib/date";

export const CURRENCIES = ["IDR", "USD", "EUR", "SGD", "MYR", "JPY", "GBP", "AUD"] as const;
export const LOCALES = ["id", "en"] as const;
export const WEEK_START_DAYS = ["monday", "sunday"] as const;

// Messages are translation keys under Settings.errors / Common.errors.
export const settingsSchema = z
  .object({
    name: z.string().trim().min(1, "required").max(80, "tooLong"),
    locale: z.enum(LOCALES),
    currency: z.enum(CURRENCIES),
    timezone: z.string().refine((tz) => isValidTimezone(tz), "invalidTimezone"),
    weekStartDay: z.enum(WEEK_START_DAYS),
    reminderEnabled: z.boolean(),
    reminderHour: z.number().int().min(0).max(23),
  })
  .partial();
export type SettingsInput = z.infer<typeof settingsSchema>;

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1, "required").max(72),
  newPassword: z.string().min(8, "passwordTooShort").max(72, "passwordTooLong"),
});

export const deleteAccountSchema = z.object({
  password: z.string().min(1, "required").max(72),
});
