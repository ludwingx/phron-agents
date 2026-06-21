"use server"

import { revalidatePath } from "next/cache"
import { CustomerService } from "../services/customer.service"
import { customerValidator } from "../validators/customer.validator"
import { ActionResponse } from "@/modules/auth/actions/auth.actions"

export async function listCustomersAction() {
  try {
    const customers = await CustomerService.listCustomers()
    return { success: true as const, data: customers }
  } catch (error: any) {
    return { success: false as const, error: error.message || "Error al cargar clientes" }
  }
}

export async function createCustomerAction(formData: unknown): Promise<ActionResponse> {
  const result = customerValidator.safeParse(formData)
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {}
    for (const [key, value] of Object.entries(result.error.flatten().fieldErrors)) {
      if (value) fieldErrors[key] = value
    }
    return {
      success: false,
      error: "Datos de contacto inválidos",
      details: fieldErrors,
    }
  }

  try {
    await CustomerService.createCustomer(result.data)
    revalidatePath("/dashboard/customers")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "Error al registrar cliente" }
  }
}

export async function updateCustomerAction(id: string, formData: unknown): Promise<ActionResponse> {
  const result = customerValidator.safeParse(formData)
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {}
    for (const [key, value] of Object.entries(result.error.flatten().fieldErrors)) {
      if (value) fieldErrors[key] = value
    }
    return {
      success: false,
      error: "Datos de contacto inválidos",
      details: fieldErrors,
    }
  }

  try {
    await CustomerService.updateCustomer(id, result.data)
    revalidatePath("/dashboard/customers")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "Error al actualizar cliente" }
  }
}

export async function deleteCustomerAction(id: string): Promise<ActionResponse> {
  try {
    await CustomerService.deleteCustomer(id)
    revalidatePath("/dashboard/customers")
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "Error al eliminar cliente" }
  }
}
