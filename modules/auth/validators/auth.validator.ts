import { z } from "zod"

export const loginValidator = z.object({
  email: z.string().min(3, "El usuario debe tener al menos 3 caracteres"),
  password: z.string().min(1, "La contraseña es requerida"),
})

export const signupValidator = z.object({
  fullName: z.string().min(2, "El nombre completo debe tener al menos 2 caracteres"),
  email: z.string().min(3, "El usuario debe tener al menos 3 caracteres").regex(/^[a-zA-Z0-9_]+$/, "El usuario solo puede contener letras, números y guiones bajos"),
  password: z.string().min(1, "La contraseña es requerida"),
})

export type LoginInput = z.infer<typeof loginValidator>
export type SignupInput = z.infer<typeof signupValidator>
