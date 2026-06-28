import { z } from "zod"

export const productVariantValidator = z.object({
  id: z.string().optional(),
  attributes: z.record(z.string(), z.string()), // Ej: {"talla": "42", "color": "Negro"}
  stock: z.number().int().nonnegative("El stock no puede ser negativo"),
})

export const productValidator = z.object({
  id: z.string().optional(),
  sku: z.string().min(2, "El SKU debe tener al menos 2 caracteres"),
  name: z.string().min(2, "El nombre debe tener al menos 2 caracteres"),
  description: z.string().optional(),
  imageUrl: z.string().url("Debe ser una URL de imagen válida").optional().or(z.literal("")),
  price: z.number().positive("El precio debe ser un número positivo"),
  variants: z.array(productVariantValidator).min(1, "Debe agregar al menos una variante de producto"),
})

export type ProductVariantInput = z.infer<typeof productVariantValidator>
export type ProductInput = z.infer<typeof productValidator>
