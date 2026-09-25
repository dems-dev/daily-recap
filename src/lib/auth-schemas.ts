import { z } from "zod";

// Messages are translation keys under Auth.errors.
const email = z.string().trim().toLowerCase().email("invalidEmail").max(254, "invalidEmail");

export const registerSchema = z.object({
  name: z.string().trim().min(1, "required").max(80, "tooLong"),
  email,
  // bcrypt only uses the first 72 bytes
  password: z.string().min(8, "passwordTooShort").max(72, "passwordTooLong"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(72),
});
