import { z } from "zod";
import { UserRole } from "@/app/generated/prisma";

export const userRegistrationSchema = z.object({
  username: z
    .string()
    .min(3, "El usuario debe tener al menos 3 caracteres")
    .max(30, "El usuario debe tener máximo 30 caracteres")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "El usuario solo puede contener letras, números y guiones bajos"
    ),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "La contraseña debe contener mayúsculas, minúsculas y números"
    ),
  role: z.nativeEnum(UserRole),
  branchId: z.string().min(1, "Selecciona una sucursal"),
});

export const userUpdateSchema = z.object({
  username: z
    .string()
    .min(3, "El usuario debe tener al menos 3 caracteres")
    .max(30, "El usuario debe tener máximo 30 caracteres")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "El usuario solo puede contener letras, números y guiones bajos"
    ),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z
    .string()
    .email("Ingresa un email válido")
    .optional()
    .or(z.literal("")),
  password: z
    .string()
    .min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      "La contraseña debe contener mayúsculas, minúsculas y números"
    )
    .optional()
    .or(z.literal("")),
  role: z.nativeEnum(UserRole),
  branchId: z.string().min(1, "Selecciona una sucursal"),
});

export type UserRegistrationInput = z.infer<typeof userRegistrationSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
