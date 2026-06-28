import { z } from "zod"

export const customerValidator = z.object({
  id: z.string().optional(),
  fullName: z.string().min(2, "El nombre completo debe tener al menos 2 caracteres"),
  phoneNumber: z.string().min(8, "El número de teléfono debe tener al menos 8 caracteres"),
  labels: z.array(z.string()),
})

export type CustomerInput = z.infer<typeof customerValidator>
