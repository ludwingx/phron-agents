"use server"

import { revalidatePath } from "next/cache"
import { ProductService } from "../services/product.service"
import { productValidator } from "../validators/product.validator"
import { ActionResponse } from "@/modules/auth/actions/auth.actions"

export async function listProductsAction() {
  try {
    const products = await ProductService.listProducts()
    // Convertir Decimal de Prisma a Number para compatibilidad de serialización en Server Components
    const serializedProducts = products.map((p) => ({
      ...p,
      price: Number(p.price),
      variants: p.variants.map((v) => ({
        ...v,
        attributes: v.attributes as Record<string, string>,
      }))
    }))
    return { success: true as const, data: serializedProducts }
  } catch (error: any) {
    return { success: false as const, error: error.message || "Error al cargar catálogo" }
  }
}

export async function createProductAction(formData: unknown): Promise<ActionResponse> {
  const result = productValidator.safeParse(formData)
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {}
    for (const [key, value] of Object.entries(result.error.flatten().fieldErrors)) {
      if (value) fieldErrors[key] = value
    }
    return {
      success: false,
      error: "Datos de producto inválidos",
      details: fieldErrors,
    }
  }

  try {
    await ProductService.createProduct(result.data)
    revalidatePath("/dashboard/products")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "Error al crear el producto" }
  }
}

export async function updateProductAction(id: string, formData: unknown): Promise<ActionResponse> {
  const result = productValidator.safeParse(formData)
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {}
    for (const [key, value] of Object.entries(result.error.flatten().fieldErrors)) {
      if (value) fieldErrors[key] = value
    }
    return {
      success: false,
      error: "Datos de producto inválidos",
      details: fieldErrors,
    }
  }

  try {
    await ProductService.updateProduct(id, result.data)
    revalidatePath("/dashboard/products")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "Error al actualizar el producto" }
  }
}

export async function deleteProductAction(id: string): Promise<ActionResponse> {
  try {
    await ProductService.deleteProduct(id)
    revalidatePath("/dashboard/products")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "Error al eliminar el producto" }
  }
}
