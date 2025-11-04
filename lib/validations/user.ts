import { z } from "zod";
import { UserRole } from "@/app/generated/prisma";

export const userRegistrationSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    ),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z
    .string()
    .email("Please enter a valid email address")
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "Password must contain uppercase, lowercase, and numbers"
    ),
  role: z.nativeEnum(UserRole, {
    errorMap: () => ({ message: "Please select a valid role" }),
  }),
  branchId: z.string().min(1, "Please select a branch"),
});

export type UserRegistrationInput = z.infer<typeof userRegistrationSchema>;
