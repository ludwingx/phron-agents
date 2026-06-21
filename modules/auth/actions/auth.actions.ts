"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { AuthService } from "../services/auth.service"
import { loginValidator, signupValidator } from "../validators/auth.validator"

export type ActionResponse<T = any> =
  | { success: true; data?: T }
  | { success: false; error: string; details?: Record<string, string[]> }

const COOKIE_NAME = "phron_session"

export async function loginAction(formData: unknown): Promise<ActionResponse> {
  const result = loginValidator.safeParse(formData)
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {}
    for (const [key, value] of Object.entries(result.error.flatten().fieldErrors)) {
      if (value) fieldErrors[key] = value
    }
    return {
      success: false,
      error: "Datos de formulario inválidos",
      details: fieldErrors,
    }
  }

  try {
    const { token } = await AuthService.authenticate(result.data)

    const cookieStore = await cookies()
    cookieStore.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 1 día
      path: "/",
    })

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "Error al iniciar sesión" }
  }
}

export async function signupAction(formData: unknown): Promise<ActionResponse> {
  const result = signupValidator.safeParse(formData)
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {}
    for (const [key, value] of Object.entries(result.error.flatten().fieldErrors)) {
      if (value) fieldErrors[key] = value
    }
    return {
      success: false,
      error: "Datos de formulario inválidos",
      details: fieldErrors,
    }
  }

  try {
    const { token } = await AuthService.register(result.data)

    const cookieStore = await cookies()
    cookieStore.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 1 día
      path: "/",
    })

    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "Error al crear la cuenta" }
  }
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
  redirect("/login")
}

export async function getCurrentSession() {
  const cookieStore = await cookies()
  const token = cookieStore.get(COOKIE_NAME)?.value
  if (!token) return null
  return AuthService.verifyToken(token)
}
